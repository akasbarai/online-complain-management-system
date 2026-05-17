const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'civicresolve',
  port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 30000)
};

console.log(
  `MySQL config: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
);

const pool = mysql.createPool({
  ...dbConfig
});

module.exports = pool;
