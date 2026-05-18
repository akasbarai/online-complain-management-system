require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = require('./connection');

const DEFAULT_IGNORED_CODES = new Set([
  'ER_DUP_FIELDNAME',
  'ER_DUP_KEYNAME',
  'ER_CANT_DROP_FIELD_OR_KEY'
]);

const safeQuery = async (db, sql, params = [], ignoredCodes = DEFAULT_IGNORED_CODES) => {
  try {
    return await db.query(sql, params);
  } catch (err) {
    if (ignoredCodes.has(err.code)) return null;
    throw err;
  }
};

const ensureMigrationTable = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const getAppliedMigrations = async (db) => {
  const [rows] = await db.query('SELECT name FROM schema_migrations');
  return new Set(rows.map(row => row.name));
};

const runMigrations = async (db = pool, options = {}) => {
  const migrationsDir = options.migrationsDir || path.join(__dirname, 'migrations');
  await ensureMigrationTable(db);

  const applied = await getAppliedMigrations(db);
  const files = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const migration = require(path.join(migrationsDir, file));
    if (!migration || typeof migration.up !== 'function') {
      throw new Error(`Migration ${file} must export an up() function`);
    }

    await migration.up(db, { safeQuery });
    await db.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    console.log(`Applied migration: ${file}`);
  }
};

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await pool.end();
      console.log('Database migrations complete.');
    })
    .catch(async (err) => {
      console.error('Database migration failed:', err);
      await pool.end().catch(() => {});
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
  safeQuery
};
