require('dotenv').config();
const app = require('./app');
const pool = require('./db/connection');
const { runMigrations } = require('./db/migrate');
const PORT = process.env.PORT || 4000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'replace_with_a_long_random_string') {
  console.error('JWT_SECRET must be set to a strong secret before starting the API.');
  process.exit(1);
}

runMigrations(pool)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CivicResolve API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to run startup migrations:', err);
    process.exit(1);
  });
