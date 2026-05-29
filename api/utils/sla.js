const TERMINAL_STATUSES = ['Resolved', 'Closed', 'Rejected', 'Withdrawn'];
const SLA_START_STATUSES = ['Assigned', 'In Progress', 'Awaiting Materials', 'Reopened'];

const SLA_RULES = {
  Critical: { hours: 24, label: '24-hour' },
  High: { hours: 48, label: '48-hour' },
  Medium: { hours: 72, label: '72-hour' },
  Low: { hours: 120, label: '5-day' },
  Unassigned: { hours: 72, label: '72-hour' }
};

const DEFAULT_SLA_RULE = SLA_RULES.Medium;

const simulationOffsetDays = Number(process.env.SLA_SIMULATION_DAYS || 0);
const SLA_SIMULATION_DAYS = Number.isFinite(simulationOffsetDays) ? Math.trunc(simulationOffsetDays) : 0;

const nowSql = () => (
  SLA_SIMULATION_DAYS === 0
    ? 'NOW()'
    : `DATE_ADD(NOW(), INTERVAL ${SLA_SIMULATION_DAYS} DAY)`
);

const getSimulatedNow = () => {
  const now = new Date();
  if (SLA_SIMULATION_DAYS === 0) return now;
  return new Date(now.getTime() + SLA_SIMULATION_DAYS * 24 * 60 * 60 * 1000);
};

const getDeadlineHours = (priority) => (
  SLA_RULES[priority]?.hours || DEFAULT_SLA_RULE.hours
);

const priorityHoursSql = (priorityExpression = 'priority') => (
  `CASE ${priorityExpression}
    WHEN 'Critical' THEN ${SLA_RULES.Critical.hours}
    WHEN 'High' THEN ${SLA_RULES.High.hours}
    WHEN 'Medium' THEN ${SLA_RULES.Medium.hours}
    WHEN 'Low' THEN ${SLA_RULES.Low.hours}
    ELSE ${DEFAULT_SLA_RULE.hours}
  END`
);

const priorityLabelSql = (priorityExpression = 'priority') => (
  `CASE ${priorityExpression}
    WHEN 'Critical' THEN '${SLA_RULES.Critical.label}'
    WHEN 'High' THEN '${SLA_RULES.High.label}'
    WHEN 'Medium' THEN '${SLA_RULES.Medium.label}'
    WHEN 'Low' THEN '${SLA_RULES.Low.label}'
    ELSE '${DEFAULT_SLA_RULE.label}'
  END`
);

const deadlineSql = (priorityExpression = 'priority', startExpression = nowSql()) =>
  `DATE_ADD(${startExpression}, INTERVAL ${priorityHoursSql(priorityExpression)} HOUR)`;

const isSlaStartStatus = (status) => SLA_START_STATUSES.includes(status);

const refreshSlaBreaches = async (db) => {
  const { getEscalationScheduler } = require('../services/escalationScheduler');
  const scheduler = getEscalationScheduler();
  if (scheduler && scheduler.db === db) {
    return scheduler.runDueEscalations();
  }

  const [overdue] = await db.query(
    `SELECT id
     FROM complaints
     WHERE is_trashed = FALSE
       AND sla_deadline IS NOT NULL
       AND sla_deadline < ${nowSql()}
       AND sla_breached = FALSE
       AND status NOT IN (?)`,
    [TERMINAL_STATUSES]
  );

  if (overdue.length === 0) return 0;

  const ids = overdue.map((row) => row.id);

  await db.query(
    `UPDATE complaints
     SET sla_breached = TRUE,
         status = CASE WHEN status NOT IN (?) THEN 'Escalated' ELSE status END,
         updated_at = NOW()
     WHERE id IN (?)`,
    [TERMINAL_STATUSES, ids]
  );

  await db.query(
    `INSERT INTO complaint_history (complaint_id, action, actor, details)
     SELECT c.id, 'SLA BREACH', 'System',
       CONCAT('Complaint exceeded the ', ${priorityLabelSql('c.priority')}, ' SLA deadline for ', COALESCE(c.priority, 'Medium'), ' priority and was escalated.')
     FROM complaints c
     WHERE c.id IN (?)
       AND NOT EXISTS (
         SELECT 1
         FROM complaint_history h
         WHERE h.complaint_id = c.id
           AND h.action = 'SLA BREACH'
       )`,
    [ids]
  );

  return ids.length;
};

module.exports = {
  SLA_RULES,
  SLA_SIMULATION_DAYS,
  SLA_START_STATUSES,
  TERMINAL_STATUSES,
  deadlineSql,
  getDeadlineHours,
  getSimulatedNow,
  isSlaStartStatus,
  nowSql,
  priorityHoursSql,
  refreshSlaBreaches
};
