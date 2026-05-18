const { createId } = require('./id');

const recipientTypeForRole = (role) => (role === 'user' ? 'User' : 'Officer');

const unreadCountSql = `
  SELECT COUNT(*) as count
  FROM notifications n
  LEFT JOIN notification_reads nr
    ON nr.notification_id = n.id
    AND nr.recipient_type = ?
    AND nr.recipient_id = ?
  WHERE n.target IN ('All', ?)
    AND nr.notification_id IS NULL
`;

const listNotificationsSql = `
  SELECT n.*, nr.read_at
  FROM notifications n
  LEFT JOIN notification_reads nr
    ON nr.notification_id = n.id
    AND nr.recipient_type = ?
    AND nr.recipient_id = ?
  WHERE n.target IN ('All', ?)
  ORDER BY n.created_at DESC
`;

const getUnreadNotificationCount = async (pool, role, recipientId) => {
  const recipientType = recipientTypeForRole(role);
  const target = role === 'user' ? 'Users' : 'Officers';
  const [[row]] = await pool.query(unreadCountSql, [recipientType, recipientId, target]);
  return row.count;
};

const getNotificationsFor = async (pool, role, recipientId) => {
  const recipientType = recipientTypeForRole(role);
  const target = role === 'user' ? 'Users' : 'Officers';
  const [rows] = await pool.query(listNotificationsSql, [recipientType, recipientId, target]);
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    target: n.target,
    priority: n.priority,
    date: n.created_at,
    read: Boolean(n.read_at)
  }));
};

const markNotificationRead = async (pool, role, recipientId, notificationId) => {
  const recipientType = recipientTypeForRole(role);
  await pool.query(
    `INSERT IGNORE INTO notification_reads (id, notification_id, recipient_type, recipient_id)
     VALUES (?, ?, ?, ?)`,
    [createId('nr-'), notificationId, recipientType, recipientId]
  );
};

module.exports = {
  getNotificationsFor,
  getUnreadNotificationCount,
  markNotificationRead
};
