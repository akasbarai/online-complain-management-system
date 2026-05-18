const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const dbServerConfig = () => ({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
  multipleStatements: false
});

const createTestDatabase = async (t) => {
  let root;
  try {
    root = await mysql.createConnection(dbServerConfig());
  } catch (err) {
    t.skip(`MySQL unavailable for integration test: ${err.message}`);
    return null;
  }

  const dbName = `civicresolve_test_${Date.now()}_${process.pid}`;
  try {
    await root.query(`CREATE DATABASE \`${dbName}\``);
  } catch (err) {
    await root.end().catch(() => {});
    t.skip(`Could not create MySQL test database: ${err.message}`);
    return null;
  }

  process.env.DB_NAME = dbName;
  process.env.MYSQLDATABASE = dbName;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'workflow-integration-test-secret';

  const pool = require('../db/connection');
  const { runMigrations } = require('../db/migrate');
  const app = require('../app');

  await runMigrations(pool);

  t.after(async () => {
    await pool.end().catch(() => {});
    await root.query(`DROP DATABASE IF EXISTS \`${dbName}\``).catch(() => {});
    await root.end().catch(() => {});
  });

  return { app, pool };
};

const seedWorkflowData = async (pool) => {
  const passwordHash = await bcrypt.hash('Password123', 10);

  await pool.query(
    'INSERT INTO departments (id, name, description, status) VALUES (?, ?, ?, ?)',
    ['dept-test', 'Public Works', 'Roads and civic infrastructure', 'Active']
  );
  await pool.query(
    'INSERT INTO hierarchy_levels (id, department_id, name, level_depth, status) VALUES (?, ?, ?, ?, ?)',
    ['level-frontline', 'dept-test', 'Ward Officer', 0, 'Active']
  );
  await pool.query(
    'INSERT INTO hierarchy_levels (id, department_id, name, parent_id, level_depth, status) VALUES (?, ?, ?, ?, ?, ?)',
    ['level-supervisor', 'dept-test', 'Supervisor', 'level-frontline', 1, 'Active']
  );
  await pool.query(
    'INSERT INTO escalation_rules (id, department_id, hierarchy_level_id, time_limit_hours, target_level_id) VALUES (?, ?, ?, ?, ?)',
    ['rule-frontline', 'dept-test', 'level-frontline', 24, 'level-supervisor']
  );
  await pool.query(
    `INSERT INTO officers (id, name, email, password_hash, department_id, hierarchy_level_id, role, jurisdiction, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['admin-test', 'Workflow Admin', 'admin.workflow@example.com', passwordHash, 'dept-test', 'level-supervisor', 'Admin', 'Central', 'Active']
  );
  await pool.query(
    `INSERT INTO officers (id, name, email, password_hash, department_id, hierarchy_level_id, role, jurisdiction, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['officer-test', 'Workflow Officer', 'officer.workflow@example.com', passwordHash, 'dept-test', 'level-frontline', 'Officer', 'Ward 1', 'Active']
  );
  await pool.query(
    `INSERT INTO users (id, name, email, mobile, address, password_hash, status, registered_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())`,
    ['user-test', 'Workflow Citizen', 'citizen.workflow@example.com', '5550100', 'Ward 1', passwordHash, 'Active']
  );
};

const startServer = async (app) => {
  const server = await new Promise(resolve => {
    const listener = app.listen(0, () => resolve(listener));
  });
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
};

const apiRequest = async ({ baseUrl, method = 'GET', path, token, body, expectedStatus = 200 }) => {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  assert.equal(response.status, expectedStatus, data?.error || `Expected ${expectedStatus}, got ${response.status}`);
  return data;
};

const login = async (baseUrl, path, email) => {
  const data = await apiRequest({
    baseUrl,
    method: 'POST',
    path,
    body: { email, password: 'Password123' }
  });
  return data.token;
};

const findAdminComplaint = async (baseUrl, adminToken, complaintId) => {
  const complaints = await apiRequest({ baseUrl, path: '/api/admin/complaints', token: adminToken });
  const complaint = complaints.find(item => item.id === complaintId);
  assert.ok(complaint, `Complaint ${complaintId} should exist`);
  return complaint;
};

test('complaint workflow supports submit, assign, escalate, withdraw, resolve, and close', async (t) => {
  const setup = await createTestDatabase(t);
  if (!setup) return;

  const { app, pool } = setup;
  await seedWorkflowData(pool);

  const { server, baseUrl } = await startServer(app);
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  const userToken = await login(baseUrl, '/api/auth/user/login', 'citizen.workflow@example.com');
  const adminToken = await login(baseUrl, '/api/auth/officer/login', 'admin.workflow@example.com');
  const officerToken = await login(baseUrl, '/api/auth/officer/login', 'officer.workflow@example.com');

  const submitted = await apiRequest({
    baseUrl,
    method: 'POST',
    path: '/api/user/complaints',
    token: userToken,
    expectedStatus: 201,
    body: {
      title: 'Broken drain cover',
      description: 'A drain cover is broken near the public road and needs repair.',
      departmentId: 'dept-test',
      location: 'Ward 1'
    }
  });
  assert.equal(submitted.status, 'Submitted');

  await apiRequest({
    baseUrl,
    method: 'PUT',
    path: `/api/admin/complaints/${submitted.id}/reassign`,
    token: adminToken,
    body: { officerId: 'officer-test', reason: 'Initial assignment' }
  });
  let complaint = await findAdminComplaint(baseUrl, adminToken, submitted.id);
  assert.equal(complaint.status, 'Assigned');
  assert.equal(complaint.assignedOfficerId, 'officer-test');

  await apiRequest({
    baseUrl,
    method: 'PUT',
    path: `/api/officer/complaints/${submitted.id}/escalate`,
    token: officerToken,
    body: { reason: 'Requires supervisor approval' }
  });
  complaint = await findAdminComplaint(baseUrl, adminToken, submitted.id);
  assert.equal(complaint.status, 'Escalated');
  assert.equal(complaint.assignedOfficerId, null);
  assert.equal(complaint.currentHierarchyLevelId, 'level-supervisor');

  const withdrawTarget = await apiRequest({
    baseUrl,
    method: 'POST',
    path: '/api/user/complaints',
    token: userToken,
    expectedStatus: 201,
    body: {
      title: 'Temporary street obstruction',
      description: 'A temporary obstruction was reported but has been cleared.',
      departmentId: 'dept-test',
      location: 'Ward 1'
    }
  });
  await apiRequest({
    baseUrl,
    method: 'PUT',
    path: `/api/user/complaints/${withdrawTarget.id}/withdraw`,
    token: userToken,
    body: { reason: 'Issue cleared before inspection' }
  });
  const withdrawn = await apiRequest({
    baseUrl,
    path: `/api/user/complaints/${withdrawTarget.id}`,
    token: userToken
  });
  assert.equal(withdrawn.status, 'Withdrawn');

  await apiRequest({
    baseUrl,
    method: 'PUT',
    path: `/api/admin/complaints/${submitted.id}/reassign`,
    token: adminToken,
    body: { officerId: 'officer-test', reason: 'Supervisor returned to officer' }
  });
  await apiRequest({
    baseUrl,
    method: 'PUT',
    path: `/api/officer/complaints/${submitted.id}/status`,
    token: officerToken,
    body: { status: 'In Progress', remark: 'Work started' }
  });
  await apiRequest({
    baseUrl,
    method: 'PUT',
    path: `/api/officer/complaints/${submitted.id}/status`,
    token: officerToken,
    body: { status: 'Resolved', remark: 'Drain cover replaced' }
  });
  await apiRequest({
    baseUrl,
    method: 'PUT',
    path: `/api/admin/complaints/${submitted.id}/status`,
    token: adminToken,
    body: { status: 'Closed', notes: 'Verified and closed' }
  });
  complaint = await findAdminComplaint(baseUrl, adminToken, submitted.id);
  assert.equal(complaint.status, 'Closed');
});
