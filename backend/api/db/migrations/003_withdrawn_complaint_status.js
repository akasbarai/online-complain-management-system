const STATUSES = "'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Resolved', 'Closed', 'Rejected', 'Withdrawn'";

exports.up = async (pool) => {
  await pool.query(`ALTER TABLE complaints MODIFY COLUMN status ENUM(${STATUSES}) DEFAULT 'Submitted'`);
  await pool.query(`
    UPDATE complaints c
    SET c.status = 'Withdrawn',
        c.assigned_officer_id = NULL,
        c.sla_deadline = NULL,
        c.updated_at = NOW()
    WHERE c.status = 'Closed'
      AND EXISTS (
        SELECT 1 FROM complaint_history h
        WHERE h.complaint_id = c.id
          AND h.action = 'Withdrawn by User'
      )
  `);
};
