require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db/connection');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const officerRoutes = require('./routes/officer');
const userRoutes = require('./routes/user');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 4000;

const ensureMigrations = async () => {
  const migrations = [
    "ALTER TABLE users ADD COLUMN password_reset_requested BOOLEAN DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN password_reset_requested_at DATETIME DEFAULT NULL",
    "ALTER TABLE complaints MODIFY COLUMN image_url LONGTEXT"
  ];

  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        throw err;
      }
    }
  }
};

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://ocms.akashbarai.com.np',
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
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

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/user', userRoutes);
app.use('/api/public', publicRoutes);

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Uploaded evidence is too large. Please choose a smaller file.' });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

ensureMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CivicResolve API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to run startup migrations:', err);
    process.exit(1);
  });
