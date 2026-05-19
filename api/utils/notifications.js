const { createId } = require('./id');

const recipientTypeForRole = (role) => (role === 'user' ? 'User' : 'Officer');
const recipientTableForRole = (role) => (role === 'user' ? 'users' : 'officers');

const unreadCountSql = `
  SELECT COUNT(*) as count
  FROM notifications n
  LEFT JOIN notification_reads nr
    ON nr.notification_id = n.id
    AND nr.recipient_type = ?
    AND nr.recipient_id = ?
  WHERE (
      (n.recipient_type IS NULL AND n.target IN ('All', ?) AND n.created_at >= ?)
      OR (n.recipient_type = ? AND n.recipient_id = ?)
    )
    AND nr.notification_id IS NULL
`;

const listNotificationsSql = `
  SELECT n.*, nr.read_at
  FROM notifications n
  LEFT JOIN notification_reads nr
    ON nr.notification_id = n.id
    AND nr.recipient_type = ?
    AND nr.recipient_id = ?
  WHERE (
      (n.recipient_type IS NULL AND n.target IN ('All', ?) AND n.created_at >= ?)
      OR (n.recipient_type = ? AND n.recipient_id = ?)
    )
  ORDER BY n.created_at DESC
`;

const visibleNotificationSql = `
  SELECT id
  FROM notifications n
  WHERE n.id = ?
    AND (
      (n.recipient_type IS NULL AND n.target IN ('All', ?) AND n.created_at >= ?)
      OR (n.recipient_type = ? AND n.recipient_id = ?)
    )
  LIMIT 1
`;

const getRecipientCreatedAt = async (pool, role, recipientId) => {
  const table = recipientTableForRole(role);
  const [rows] = await pool.query(`SELECT created_at FROM ${table} WHERE id = ?`, [recipientId]);
  return rows[0]?.created_at || new Date(0);
};

const getUnreadNotificationCount = async (pool, role, recipientId) => {
  const recipientType = recipientTypeForRole(role);
  const target = role === 'user' ? 'Users' : 'Officers';
  const recipientCreatedAt = await getRecipientCreatedAt(pool, role, recipientId);
  const [[row]] = await pool.query(
    unreadCountSql,
    [recipientType, recipientId, target, recipientCreatedAt, recipientType, recipientId]
  );
  return row.count;
};

const getNotificationsFor = async (pool, role, recipientId) => {
  const recipientType = recipientTypeForRole(role);
  const target = role === 'user' ? 'Users' : 'Officers';
  const recipientCreatedAt = await getRecipientCreatedAt(pool, role, recipientId);
  const [rows] = await pool.query(
    listNotificationsSql,
    [recipientType, recipientId, target, recipientCreatedAt, recipientType, recipientId]
  );
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    target: n.target,
    recipientType: n.recipient_type,
    recipientId: n.recipient_id,
    priority: n.priority,
    date: n.created_at,
    read: Boolean(n.read_at)
  }));
};

const createNotification = async (pool, {
  title,
  message,
  target = 'All',
  priority = 'Normal',
  recipientType = null,
  recipientId = null
}) => {
  const id = createId('n-');
  await pool.query(
    `INSERT INTO notifications (id, title, message, target, priority, recipient_type, recipient_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, title, message, target, priority, recipientType, recipientId]
  );
  return { id, title, message, target, priority, recipientType, recipientId, date: new Date().toISOString() };
};

const markNotificationRead = async (pool, role, recipientId, notificationId) => {
  const recipientType = recipientTypeForRole(role);
  const target = role === 'user' ? 'Users' : 'Officers';
  const recipientCreatedAt = await getRecipientCreatedAt(pool, role, recipientId);
  const [visibleNotifications] = await pool.query(
    visibleNotificationSql,
    [notificationId, target, recipientCreatedAt, recipientType, recipientId]
  );

  if (visibleNotifications.length === 0) {
    return false;
  }

  await pool.query(
    `INSERT IGNORE INTO notification_reads (id, notification_id, recipient_type, recipient_id)
     VALUES (?, ?, ?, ?)`,
    [createId('nr-'), notificationId, recipientType, recipientId]
  );
  return true;
};

module.exports = {
  createNotification,
  getNotificationsFor,
  getUnreadNotificationCount,
  markNotificationRead
};
