exports.up = async (pool, { safeQuery }) => {
  await safeQuery(pool, 'ALTER TABLE users ADD COLUMN password_reset_requested BOOLEAN DEFAULT FALSE');
  await safeQuery(pool, 'ALTER TABLE users ADD COLUMN password_reset_requested_at DATETIME DEFAULT NULL');
  await safeQuery(pool, 'ALTER TABLE users MODIFY COLUMN profile_picture LONGTEXT');
  await safeQuery(pool, 'ALTER TABLE users MODIFY COLUMN id_card_url LONGTEXT');
  await safeQuery(pool, 'ALTER TABLE complaints MODIFY COLUMN image_url LONGTEXT');
  await safeQuery(pool, "ALTER TABLE notifications MODIFY COLUMN target ENUM('All', 'Users', 'Officers', 'Admins') DEFAULT 'All'");
  await safeQuery(pool, "ALTER TABLE notifications ADD COLUMN recipient_type ENUM('User', 'Officer', 'Admin') DEFAULT NULL");
  await safeQuery(pool, 'ALTER TABLE notifications ADD COLUMN recipient_id VARCHAR(50) DEFAULT NULL');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      id VARCHAR(50) PRIMARY KEY,
      notification_id VARCHAR(50) NOT NULL,
      recipient_type ENUM('User', 'Officer', 'Admin') NOT NULL,
      recipient_id VARCHAR(50) NOT NULL,
      read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_notification_recipient (notification_id, recipient_type, recipient_id),
      FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
    )
  `);
  await safeQuery(pool, "ALTER TABLE notification_reads MODIFY COLUMN recipient_type ENUM('User', 'Officer', 'Admin') NOT NULL");
  await safeQuery(pool, 'CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id)');
  await safeQuery(pool, 'CREATE INDEX idx_notification_reads_recipient ON notification_reads(recipient_type, recipient_id)');
};
