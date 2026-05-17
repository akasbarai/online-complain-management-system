require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'civicresolve'
  });

  console.log('Connected to database');

  // Create admin account
  const adminPassword = 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const adminId = 'admin-001';

  try {
    // Check if admin already exists
    const [existing] = await connection.query('SELECT id FROM officers WHERE id = ?', [adminId]);
    if (existing.length > 0) {
      console.log('Admin account already exists');
    } else {
      // Create a default department first
      const [deptExists] = await connection.query('SELECT id FROM departments WHERE id = ?', ['dept-general']);
      if (deptExists.length === 0) {
        await connection.query(
          'INSERT INTO departments (id, name, description, status) VALUES (?, ?, ?, ?)',
          ['dept-general', 'General Administration', 'Default department for system administration', 'Active']
        );
        console.log('Created default department: General Administration');
      }

      await connection.query(
        `INSERT INTO officers (id, name, email, password_hash, department_id, role, jurisdiction, status)
         VALUES (?, ?, ?, ?, ?, 'Admin', 'System-wide', 'Active')`,
        [adminId, 'System Admin', 'admin@civicresolve.com', passwordHash, 'dept-general']
      );
      console.log('Created admin account:');
      console.log('  Email: admin@civicresolve.com');
      console.log('  Password: admin123');
    }
  } catch (err) {
    console.error('Error creating admin:', err.message);
  } finally {
    await connection.end();
  }
}

seed();
