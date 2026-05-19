const SLA_HOURS = Number(process.env.SLA_HOURS || 72);
const TERMINAL_STATUSES = ['Resolved', 'Closed', 'Rejected'];
const SLA_START_STATUSES = ['Assigned', 'In Progress', 'Awaiting Materials'];

const deadlineSql = () => `DATE_ADD(NOW(), INTERVAL ${SLA_HOURS} HOUR)`;

const isSlaStartStatus = (status) => SLA_START_STATUSES.includes(status);

const refreshSlaBreaches = async (db) => {
  const [overdue] = await db.query(
    `SELECT id
     FROM complaints
     WHERE is_trashed = FALSE
       AND sla_deadline IS NOT NULL
       AND sla_deadline < NOW()
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
       CONCAT('Complaint exceeded the ', ?, '-hour SLA deadline and was escalated.')
     FROM complaints c
     WHERE c.id IN (?)
       AND NOT EXISTS (
         SELECT 1
         FROM complaint_history h
         WHERE h.complaint_id = c.id
           AND h.action = 'SLA BREACH'
       )`,
    [SLA_HOURS, ids]
  );

  return ids.length;
};

module.exports = {
  SLA_HOURS,
  deadlineSql,
  isSlaStartStatus,
  refreshSlaBreaches
};
