const mysql = require('mysql2/promise');

const parseDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;
  if (!databaseUrl) return {};

  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    port: Number(url.port || 3306)
  };
};

const urlConfig = parseDatabaseUrl();

const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || urlConfig.host || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || urlConfig.user || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || urlConfig.password || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || urlConfig.database || 'ocms',
  port: Number(process.env.MYSQLPORT || process.env.DB_PORT || urlConfig.port || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 30000)
};

const hasExplicitDbHost = Boolean(
  process.env.MYSQLHOST ||
  process.env.DB_HOST ||
  process.env.DATABASE_URL ||
  process.env.MYSQL_URL ||
  process.env.MYSQL_PUBLIC_URL
);

if (process.env.RENDER && !hasExplicitDbHost && ['localhost', '127.0.0.1', '::1'].includes(dbConfig.host)) {
  throw new Error(
    'Database host is still localhost on Render. Add DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, and DB_PORT to the Render backend service, or set DATABASE_URL/MYSQL_URL from your hosted MySQL service.'
  );
}

console.log(
  `MySQL config: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
);

const pool = mysql.createPool({
  ...dbConfig
});

module.exports = pool;
