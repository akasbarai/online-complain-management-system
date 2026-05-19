require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db/connection');
const rateLimit = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const officerRoutes = require('./routes/officer');
const userRoutes = require('./routes/user');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'replace_with_a_long_random_string') {
  console.error('JWT_SECRET must be set to a strong secret before starting the API.');
  process.exit(1);
}

const ensureMigrations = async () => {
  const migrations = [
    "ALTER TABLE users ADD COLUMN password_reset_requested BOOLEAN DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN password_reset_requested_at DATETIME DEFAULT NULL",
    "ALTER TABLE complaints MODIFY COLUMN image_url LONGTEXT",
    "ALTER TABLE complaints ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL AFTER location",
    "ALTER TABLE complaints ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL AFTER latitude",
    "ALTER TABLE notifications ADD COLUMN recipient_type ENUM('User', 'Officer') DEFAULT NULL",
    "ALTER TABLE notifications ADD COLUMN recipient_id VARCHAR(50) DEFAULT NULL",
    `CREATE TABLE IF NOT EXISTS notification_reads (
      id VARCHAR(50) PRIMARY KEY,
      notification_id VARCHAR(50) NOT NULL,
      recipient_type ENUM('User', 'Officer') NOT NULL,
      recipient_id VARCHAR(50) NOT NULL,
      read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_notification_recipient (notification_id, recipient_type, recipient_id),
      FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
    )`,
    "CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id)",
    "CREATE INDEX idx_notification_reads_recipient ON notification_reads(recipient_type, recipient_id)",
    "CREATE INDEX idx_complaints_coordinates ON complaints(latitude, longitude)"
  ];

  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err) {
      if (!['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME'].includes(err.code)) {
        throw err;
      }
    }
  }
};

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:3000',
  'http://[::1]:5173',
  'http://[::1]:5174',
  'http://[::1]:5175',
  'http://[::1]:3000',
  'http://localhost:4173',
  'http://localhost:4174',
  'http://localhost:4175',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:4174',
  'http://127.0.0.1:4175',
  'http://[::1]:4173',
  'http://[::1]:4174',
  'http://[::1]:4175',
  'https://ocms.akashbarai.com.np',
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', database: 'Connected' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', database: 'Disconnected', error: err.message });
  }
});

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 60, keyPrefix: 'auth' }), authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/user', userRoutes);
app.use('/api/public', publicRoutes);

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed by CORS' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Uploaded evidence is too large. Please choose a smaller file.' });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

ensureMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`OCMS API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to run startup migrations:', err);
    process.exit(1);
  });
