const { createNotification } = require('./notifications');

const TERMINAL_STATUSES = ['Resolved', 'Closed', 'Rejected'];

const STATUS_TRANSITIONS = {
  Submitted: ['Under Review', 'Assigned', 'Rejected'],
  'Under Review': ['Assigned', 'Rejected'],
  Assigned: ['In Progress', 'Awaiting Materials', 'Escalated', 'Rejected'],
  'In Progress': ['Awaiting Materials', 'Resolved', 'Escalated', 'Rejected'],
  'Awaiting Materials': ['In Progress', 'Resolved', 'Escalated', 'Rejected'],
  Escalated: ['Assigned', 'In Progress', 'Resolved', 'Rejected'],
  Resolved: ['Closed'],
  Rejected: ['Closed'],
  Closed: []
};

const validateStatusTransition = (fromStatus, toStatus) => {
  if (fromStatus === toStatus) return null;
  const allowed = STATUS_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    return `Cannot change complaint status from ${fromStatus} to ${toStatus}`;
  }
  return null;
};

const getSlaHours = async (pool, departmentId, hierarchyLevelId) => {
  if (!departmentId || !hierarchyLevelId) return 72;

  const [rules] = await pool.query(
    `SELECT time_limit_hours
     FROM escalation_rules
     WHERE department_id = ? AND hierarchy_level_id = ?
     LIMIT 1`,
    [departmentId, hierarchyLevelId]
  );

  return rules.length > 0 ? Number(rules[0].time_limit_hours) : 72;
};

const getSlaDeadline = async (pool, departmentId, hierarchyLevelId) => {
  const hours = await getSlaHours(pool, departmentId, hierarchyLevelId);
  const [[deadline]] = await pool.query('SELECT DATE_ADD(NOW(), INTERVAL ? HOUR) AS value', [hours]);
  return deadline.value;
};

const refreshSlaBreaches = async (pool) => {
  const [overdue] = await pool.query(
    `SELECT c.id, c.title, c.user_id, c.department_id, c.assigned_officer_id, c.current_hierarchy_level_id,
            r.target_level_id
     FROM complaints c
     LEFT JOIN escalation_rules r
       ON r.department_id = c.department_id
      AND r.hierarchy_level_id = c.current_hierarchy_level_id
     WHERE c.is_trashed = FALSE
       AND c.sla_deadline IS NOT NULL
       AND c.sla_deadline < NOW()
       AND c.sla_breached = FALSE
       AND c.status NOT IN ('Resolved', 'Closed', 'Rejected')`
  );

  for (const complaint of overdue) {
    const targetLevelId = complaint.target_level_id || complaint.current_hierarchy_level_id;

    await pool.query(
      `UPDATE complaints
       SET status = 'Escalated',
           sla_breached = TRUE,
           assigned_officer_id = NULL,
           current_hierarchy_level_id = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [targetLevelId, complaint.id]
    );

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [
        complaint.id,
        'SLA BREACH: Auto-escalated',
        'System',
        targetLevelId
          ? `Escalated according to rule for hierarchy level ${targetLevelId}.`
          : 'Escalated because the SLA deadline passed.'
      ]
    );

    if (complaint.assigned_officer_id) {
      await createNotification(pool, {
        title: `Complaint #${complaint.id} Escalated`,
        message: 'This complaint breached its SLA and was removed from your active assignment queue.',
        target: 'Officers',
        recipientType: 'Officer',
        recipientId: complaint.assigned_officer_id,
        priority: 'Urgent'
      });
    }

    await createNotification(pool, {
      title: `Complaint #${complaint.id} Escalated`,
      message: 'Your complaint has been escalated because the resolution deadline was breached.',
      target: 'Users',
      recipientType: 'User',
      recipientId: complaint.user_id,
      priority: 'Important'
    });

    await createNotification(pool, {
      title: 'SLA Breach Detected',
      message: `Complaint #${complaint.id} breached its SLA and needs reassignment.`,
      target: 'Admins',
      priority: 'Urgent'
    });
  }

  return overdue.length;
};

module.exports = {
  STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  getSlaDeadline,
  refreshSlaBreaches,
  validateStatusTransition
};
