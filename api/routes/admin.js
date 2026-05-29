const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../db/connection');
const authMiddleware = require('../middleware/auth');
const { createId } = require('../utils/id');
const { sendAccountVerifiedEmail } = require('../utils/email');
const { createNotification, getUnreadNotificationCount, markNotificationRead } = require('../utils/notifications');
const { deadlineSql, nowSql, refreshSlaBreaches } = require('../utils/sla');
const { getEscalationScheduler } = require('../services/escalationScheduler');
const {
  isValidEmail,
  normalizeEmail,
  validateEnum,
  validateRequired
} = require('../utils/validation');
const router = express.Router();

const USER_STATUSES = ['Active', 'Inactive', 'Blocked', 'Pending'];
const COMPLAINT_STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Resolved', 'Closed', 'Rejected', 'Withdrawn', 'Reopened'];
const PRIORITIES = ['Unassigned', 'Low', 'Medium', 'High', 'Critical'];
const NOTIFICATION_TARGETS = ['All', 'Users', 'Officers'];
const NOTIFICATION_PRIORITIES = ['Normal', 'Important', 'Urgent'];
const TERMINAL_COMPLAINT_STATUSES = ['Resolved', 'Closed', 'Rejected', 'Withdrawn'];
const OFFICER_REQUIRED_STATUSES = ['Assigned', 'In Progress', 'Awaiting Materials', 'Resolved'];
const ADMIN_STATUS_TRANSITIONS = {
  Submitted: ['Under Review', 'Rejected', 'Closed'],
  'Under Review': ['Assigned', 'Rejected', 'Closed'],
  Assigned: ['In Progress', 'Awaiting Materials', 'Escalated', 'Resolved', 'Rejected', 'Closed'],
  'In Progress': ['Awaiting Materials', 'Escalated', 'Resolved', 'Rejected', 'Closed'],
  'Awaiting Materials': ['In Progress', 'Escalated', 'Resolved', 'Rejected', 'Closed'],
  Escalated: ['Assigned', 'In Progress', 'Awaiting Materials', 'Resolved', 'Rejected', 'Closed'],
  Reopened: ['Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Resolved', 'Rejected', 'Closed'],
  Resolved: ['Closed'],
  Closed: [],
  Rejected: [],
  Withdrawn: []
};

const isTerminalComplaintStatus = (status) => TERMINAL_COMPLAINT_STATUSES.includes(status);

const syncEscalationQueue = async (complaintId) => {
  const scheduler = getEscalationScheduler();
  if (!scheduler) return;

  try {
    await scheduler.syncComplaintById(complaintId);
  } catch (err) {
    console.error(`Failed to sync escalation queue for complaint ${complaintId}:`, err);
  }
};

const canAdminSetComplaintStatus = (currentStatus, nextStatus, hasAssignedOfficer) => {
  if (currentStatus === nextStatus) {
    return { allowed: false, reason: `Complaint is already ${nextStatus}` };
  }

  const allowedStatuses = ADMIN_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedStatuses.includes(nextStatus)) {
    return { allowed: false, reason: `Cannot change complaint from ${currentStatus} to ${nextStatus}` };
  }

  if (OFFICER_REQUIRED_STATUSES.includes(nextStatus) && !hasAssignedOfficer) {
    return { allowed: false, reason: `Assign an officer before setting this complaint to ${nextStatus}` };
  }

  return { allowed: true };
};

const notifyAssignedOfficer = async (complaint, title, message, priority = 'Normal') => {
  if (!complaint.assigned_officer_id) return;
  await createNotification(pool, {
    title,
    message,
    target: 'Officers',
    recipientType: 'Officer',
    recipientId: complaint.assigned_officer_id,
    priority
  });
};

const getUserPortalBaseUrl = (req) => {
  if (process.env.USER_PORTAL_URL) {
    return process.env.USER_PORTAL_URL.replace(/\/$/, '');
  }

  const origin = req.get('origin');
  if (!origin) return 'http://localhost:5175';

  try {
    const url = new URL(origin);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1') {
      url.port = '5175';
    }
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return origin.replace(/\/admin.*$/, '').replace(/\/$/, '');
  }
};

const getUserLoginUrl = (req) => `${getUserPortalBaseUrl(req)}/#/login`;

router.use(authMiddleware('admin'));

router.get('/attention', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const [[pendingUsers]] = await pool.query("SELECT COUNT(*) as count FROM users WHERE status = 'Pending'");
    const [[unassignedComplaints]] = await pool.query(
      "SELECT COUNT(*) as count FROM complaints WHERE assigned_officer_id IS NULL AND is_trashed = FALSE"
    );
    const [[escalatedComplaints]] = await pool.query(
      "SELECT COUNT(*) as count FROM complaints WHERE status = 'Escalated' AND is_trashed = FALSE"
    );
    const [[slaBreachedComplaints]] = await pool.query(
      `SELECT COUNT(*) as count FROM complaints
       WHERE is_trashed = FALSE
       AND status NOT IN ('Resolved', 'Closed', 'Rejected', 'Withdrawn')
       AND (sla_breached = TRUE OR (sla_deadline IS NOT NULL AND sla_deadline < ${nowSql()}))`
    );
    const [[complaintsNeedingAttention]] = await pool.query(
      `SELECT COUNT(DISTINCT id) as count FROM complaints
       WHERE is_trashed = FALSE
       AND status NOT IN ('Resolved', 'Closed', 'Rejected', 'Withdrawn')
       AND (
         assigned_officer_id IS NULL
         OR status = 'Escalated'
         OR sla_breached = TRUE
         OR (sla_deadline IS NOT NULL AND sla_deadline < ${nowSql()})
       )`
    );
    const [[officerSetupIssues]] = await pool.query(
      "SELECT COUNT(*) as count FROM officers WHERE role != 'Admin' AND (status != 'Active' OR hierarchy_level_id IS NULL)"
    );
    const [[departmentSetupIssues]] = await pool.query(
      `SELECT COUNT(*) as count
       FROM departments d
       WHERE d.status = 'Active'
       AND (
         NOT EXISTS (SELECT 1 FROM hierarchy_levels h WHERE h.department_id = d.id AND h.status = 'Active')
         OR NOT EXISTS (SELECT 1 FROM officers o WHERE o.department_id = d.id AND o.status = 'Active')
       )`
    );
    const notifications = await getUnreadNotificationCount(pool, 'admin', req.user.id);

    res.json({
      notifications,
      users: pendingUsers.count,
      pendingUsers: pendingUsers.count,
      complaints: complaintsNeedingAttention.count,
      unassignedComplaints: unassignedComplaints.count,
      escalatedComplaints: escalatedComplaints.count,
      slaBreachedComplaints: slaBreachedComplaints.count,
      officers: officerSetupIssues.count,
      departments: departmentSetupIssues.count,
      hierarchy: departmentSetupIssues.count
    });
  } catch (err) {
    console.error('Admin attention error:', err);
    res.status(500).json({ error: 'Failed to fetch attention summary' });
  }
});

router.get('/departments', async (req, res) => {
  try {
    const [departments] = await pool.query(
      `SELECT d.*, 
        (SELECT COUNT(*) FROM complaints c WHERE c.department_id = d.id) as complaint_count,
        (SELECT COUNT(*) FROM officers o WHERE o.department_id = d.id) as officer_count
       FROM departments d`
    );

    const formatted = departments.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description,
      status: d.status,
      stats: { complaints: d.complaint_count, officers: d.officer_count }
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.post('/departments', async (req, res) => {
  try {
    const { name, description } = req.body;
    const requiredError = validateRequired({ name });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const id = createId('d-');

    await pool.query('INSERT INTO departments (id, name, description) VALUES (?, ?, ?)', [id, name.trim(), description || '']);

    res.status(201).json({ id, name: name.trim(), description, status: 'Active', stats: { complaints: 0, officers: 0 } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.put('/departments/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    await pool.query('UPDATE departments SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
      [name, description, req.params.id]);
    res.json({ message: 'Department updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.put('/departments/:id/status', async (req, res) => {
  try {
    const [depts] = await pool.query('SELECT status FROM departments WHERE id = ?', [req.params.id]);
    if (depts.length === 0) return res.status(404).json({ error: 'Department not found' });

    const newStatus = depts[0].status === 'Active' ? 'Inactive' : 'Active';
    await pool.query('UPDATE departments SET status = ? WHERE id = ?', [newStatus, req.params.id]);
    res.json({ message: 'Department status updated', status: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    const [[counts]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM complaints WHERE department_id = ?) as complaints,
        (SELECT COUNT(*) FROM officers WHERE department_id = ?) as officers
       `,
      [req.params.id, req.params.id]
    );

    if (counts.complaints > 0 || counts.officers > 0) {
      return res.status(400).json({
        error: `Cannot delete this department because it has ${counts.complaints} complaint(s) and ${counts.officers} officer(s). Reassign or remove those records first, or deactivate the department instead.`
      });
    }

    const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Department not found' });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'Cannot delete department with associated records' });
    }
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// Hierarchy
router.get('/hierarchy', async (req, res) => {
  try {
    const [hierarchy] = await pool.query('SELECT * FROM hierarchy_levels ORDER BY department_id, level_depth');
    res.json(hierarchy.map(h => ({
      id: h.id,
      departmentId: h.department_id,
      name: h.name,
      parentId: h.parent_id,
      status: h.status,
      levelDepth: h.level_depth
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hierarchy' });
  }
});

router.post('/hierarchy', async (req, res) => {
  try {
    const { departmentId, name, parentId } = req.body;
    const requiredError = validateRequired({ departmentId, name });
    if (requiredError) return res.status(400).json({ error: requiredError });

    if (parentId) {
      const [parent] = await pool.query('SELECT level_depth FROM hierarchy_levels WHERE id = ?', [parentId]);
      if (parent.length === 0) return res.status(400).json({ error: 'Parent level not found' });
      var levelDepth = parent[0].level_depth + 1;
    } else {
      var levelDepth = 0;
    }

    const id = createId('h-');
    await pool.query(
      'INSERT INTO hierarchy_levels (id, department_id, name, parent_id, level_depth) VALUES (?, ?, ?, ?, ?)',
      [id, departmentId, name, parentId || null, levelDepth]
    );

    res.status(201).json({ id, departmentId, name, parentId, status: 'Active', levelDepth });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create hierarchy level' });
  }
});

router.put('/hierarchy/:id', async (req, res) => {
  try {
    const { name } = req.body;
    await pool.query('UPDATE hierarchy_levels SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ message: 'Hierarchy level updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update hierarchy level' });
  }
});

router.put('/hierarchy/:id/status', async (req, res) => {
  try {
    const [levels] = await pool.query('SELECT status FROM hierarchy_levels WHERE id = ?', [req.params.id]);
    const newStatus = levels[0].status === 'Active' ? 'Inactive' : 'Active';
    await pool.query('UPDATE hierarchy_levels SET status = ? WHERE id = ?', [newStatus, req.params.id]);
    await pool.query('UPDATE officers SET status = ? WHERE hierarchy_level_id = ?', [newStatus, req.params.id]);
    res.json({ message: 'Status updated', status: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.delete('/hierarchy/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM hierarchy_levels WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Hierarchy level not found' });
    res.json({ message: 'Hierarchy level deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'Cannot delete hierarchy level with associated records' });
    }
    res.status(500).json({ error: 'Failed to delete hierarchy level' });
  }
});

// Officers
router.get('/officers', async (req, res) => {
  try {
    const [officers] = await pool.query("SELECT * FROM officers WHERE role != 'Admin'");
    res.json(officers.map(o => ({
      id: o.id,
      name: o.name,
      email: o.email,
      departmentId: o.department_id,
      hierarchyLevelId: o.hierarchy_level_id,
      role: o.role,
      jurisdiction: o.jurisdiction,
      status: o.status,
      profilePhoto: o.profile_photo
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch officers' });
  }
});

router.post('/officers', async (req, res) => {
  try {
    const { name, email, departmentId, hierarchyLevelId, role, jurisdiction } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const requiredError = validateRequired({ name, email: normalizedEmail, departmentId });
    if (requiredError) return res.status(400).json({ error: requiredError });
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({ error: 'A valid email is required' });

    const [existing] = await pool.query('SELECT id FROM officers WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const tempPassword = crypto.randomBytes(6).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const id = createId('o-');

    await pool.query(
      'INSERT INTO officers (id, name, email, password_hash, department_id, hierarchy_level_id, role, jurisdiction, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name.trim(), normalizedEmail, passwordHash, departmentId, hierarchyLevelId || null, role || 'Officer', jurisdiction || null, 'Active']
    );

    res.status(201).json({
      officer: { id, name: name.trim(), email: normalizedEmail, departmentId, hierarchyLevelId, role: role || 'Officer', jurisdiction, status: 'Active' },
      password: tempPassword
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create officer' });
  }
});

router.put('/officers/:id/assignment', async (req, res) => {
  try {
    const { hierarchyLevelId, jurisdiction } = req.body;
    await pool.query(
      'UPDATE officers SET hierarchy_level_id = ?, jurisdiction = ? WHERE id = ?',
      [hierarchyLevelId, jurisdiction, req.params.id]
    );
    res.json({ message: 'Officer assignment updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

router.put('/officers/:id/status', async (req, res) => {
  try {
    const [officers] = await pool.query('SELECT status FROM officers WHERE id = ?', [req.params.id]);
    const newStatus = officers[0].status === 'Active' ? 'Inactive' : 'Active';
    await pool.query('UPDATE officers SET status = ? WHERE id = ?', [newStatus, req.params.id]);
    res.json({ message: 'Officer status updated', status: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.delete('/officers/:id', async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM officers WHERE id = ? AND role != 'Admin'", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Officer not found' });
    res.json({ message: 'Officer deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'Cannot delete officer with associated records. Deactivate the officer instead.' });
    }
    res.status(500).json({ error: 'Failed to delete officer' });
  }
});

// Users
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, email, mobile, address, status,
        profile_picture, id_card_url, registered_date,
        (SELECT COUNT(*) FROM complaints WHERE user_id = users.id) as complaint_count
       FROM users`
    );
    res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      address: u.address,
      status: u.status,
      profilePicture: u.profile_picture,
      idCardUrl: u.id_card_url,
      registeredDate: u.registered_date,
      complaintCount: u.complaint_count
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const statusError = validateEnum(status, USER_STATUSES, 'Status');
    if (statusError) return res.status(400).json({ error: statusError });

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    
    if (status === 'Blocked') {
      const [users] = await pool.query('SELECT name FROM users WHERE id = ?', [req.params.id]);
      const userName = users.length > 0 ? users[0].name : 'User';
      await createNotification(pool, {
        title: 'Account Suspended',
        message: `Dear ${userName}, your account has been suspended by the administrator. Please contact support for assistance.`,
        target: 'Users',
        recipientType: 'User',
        recipientId: req.params.id
      });
    }
    
    res.json({ message: 'User status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

router.put('/users/:id/verify', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    await pool.query('UPDATE users SET status = ? WHERE id = ?', ['Active', req.params.id]);
    await createNotification(pool, {
      title: 'Account Verified',
      message: `Dear ${users[0].name}, your account has been verified. You can now log in and lodge complaints.`,
      target: 'Users',
      recipientType: 'User',
      recipientId: req.params.id
    });

    let emailSent = false;
    let emailError = null;
    try {
      await sendAccountVerifiedEmail({
        to: users[0].email,
        name: users[0].name,
        loginUrl: getUserLoginUrl(req)
      });
      emailSent = true;
    } catch (mailErr) {
      console.error('Account verification email failed:', mailErr.message);
      emailError = mailErr.code === 'MAIL_NOT_CONFIGURED'
        ? mailErr.message
        : 'The user was verified, but the acknowledgement email could not be sent.';
    }

    res.json({
      message: emailSent
        ? 'User verified successfully and acknowledgement email sent.'
        : 'User verified successfully, but acknowledgement email was not sent.',
      emailSent,
      emailError
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'Cannot delete user with associated records' });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Complaints
router.get('/complaints', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const [complaints] = await pool.query(`
      SELECT c.*, u.name as user_name, o.name as officer_name, hl.name as hierarchy_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN officers o ON c.assigned_officer_id = o.id
      LEFT JOIN hierarchy_levels hl ON c.current_hierarchy_level_id = hl.id
      WHERE c.is_trashed = FALSE
      ORDER BY c.created_at DESC
    `);

    const complaintIds = complaints.map(c => c.id);
    let history = [];
    if (complaintIds.length > 0) {
      const [historyRows] = await pool.query(
        'SELECT * FROM complaint_history WHERE complaint_id IN (?) ORDER BY created_at ASC',
        [complaintIds]
      );
      history = historyRows;
    }

    const formatted = complaints.map(c => ({
      id: c.id,
      title: c.title,
      departmentId: c.department_id,
      userId: c.user_id,
      description: c.description,
      location: c.location,
      latitude: c.latitude === null ? null : Number(c.latitude),
      longitude: c.longitude === null ? null : Number(c.longitude),
      imageUrl: c.image_url,
      status: c.status,
      priority: c.priority,
      assignedOfficerId: c.assigned_officer_id,
      currentHierarchyLevelId: c.current_hierarchy_level_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      slaStartedAt: c.sla_started_at,
      slaDeadline: c.sla_deadline,
      slaBreached: c.sla_breached === 1,
      history: history.filter(h => h.complaint_id === c.id).map(h => ({
        date: h.created_at,
        action: h.action,
        actor: h.actor,
        details: h.details
      }))
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching complaints:', err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

router.put('/complaints/:id/reassign', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const { officerId, reason } = req.body;
    const requiredError = validateRequired({ officerId, reason });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const [complaints] = await pool.query(
      'SELECT id, user_id, department_id, status FROM complaints WHERE id = ? AND is_trashed = FALSE',
      [req.params.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    if (isTerminalComplaintStatus(complaints[0].status)) {
      return res.status(400).json({ error: `${complaints[0].status} complaints cannot be assigned or reassigned` });
    }

    const [officers] = await pool.query(
      "SELECT hierarchy_level_id, department_id FROM officers WHERE id = ? AND status = 'Active' AND role != 'Admin'",
      [officerId]
    );
    if (officers.length === 0) return res.status(404).json({ error: 'Officer not found' });
    if (officers[0].department_id !== complaints[0].department_id) {
      return res.status(400).json({ error: 'Officer must belong to the complaint department' });
    }

    const [result] = await pool.query(
      `UPDATE complaints SET 
        assigned_officer_id = ?, 
        current_hierarchy_level_id = ?,
        status = 'Assigned',
        sla_started_at = CASE WHEN sla_started_at IS NULL THEN ${nowSql()} ELSE sla_started_at END,
        sla_deadline = CASE
          WHEN sla_deadline IS NULL THEN ${deadlineSql('priority', `COALESCE(sla_started_at, ${nowSql()})`)}
          ELSE sla_deadline
        END,
        updated_at = NOW()
       WHERE id = ?`,
      [officerId, officers[0].hierarchy_level_id, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, `Reassigned: ${reason}`, 'Admin', reason]
    );
    await syncEscalationQueue(req.params.id);

    await createNotification(pool, {
      title: 'New Complaint Assigned',
      message: `Complaint #${req.params.id} has been assigned to you.`,
      target: 'Officers',
      recipientType: 'Officer',
      recipientId: officerId
    });

    await createNotification(pool, {
      title: 'Complaint Assigned',
      message: `Your complaint #${req.params.id} has been assigned to an officer.`,
      target: 'Users',
      recipientType: 'User',
      recipientId: complaints[0].user_id
    });

    res.json({ message: 'Complaint reassigned' });
  } catch (err) {
    console.error('Reassign error:', err);
    res.status(500).json({ error: 'Failed to reassign complaint' });
  }
});

router.put('/complaints/:id/status', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const { status, notes } = req.body;
    const statusError = validateEnum(status, COMPLAINT_STATUSES, 'Status');
    if (statusError) return res.status(400).json({ error: statusError });
    if (['Awaiting Materials', 'Escalated', 'Resolved', 'Closed', 'Rejected'].includes(status) && !String(notes || '').trim()) {
      return res.status(400).json({ error: 'Notes are required for this status update' });
    }

    const [complaints] = await pool.query(
      'SELECT id, user_id, assigned_officer_id, status FROM complaints WHERE id = ? AND is_trashed = FALSE',
      [req.params.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    const transition = canAdminSetComplaintStatus(
      complaints[0].status,
      status,
      Boolean(complaints[0].assigned_officer_id)
    );
    if (!transition.allowed) return res.status(400).json({ error: transition.reason });

    const [result] = await pool.query(
      `UPDATE complaints SET 
        status = ?,
        sla_started_at = CASE
          WHEN sla_started_at IS NULL AND ? IN ('Assigned', 'In Progress', 'Awaiting Materials') THEN ${nowSql()}
          ELSE sla_started_at
        END,
        sla_deadline = CASE
          WHEN sla_deadline IS NULL AND ? IN ('Assigned', 'In Progress', 'Awaiting Materials') THEN ${deadlineSql('priority', `COALESCE(sla_started_at, ${nowSql()})`)}
          ELSE sla_deadline
        END,
        updated_at = NOW()
       WHERE id = ?`,
      [status, status, status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    const action = status === 'Awaiting Materials'
      ? 'More information requested from citizen'
      : `Status Update: ${status}${notes ? ` - ${notes}` : ''}`;
    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, action, 'Admin', notes || '']
    );
    await syncEscalationQueue(req.params.id);

    const userNotificationTitle = status === 'Awaiting Materials'
      ? `Action needed for complaint #${req.params.id}`
      : `Complaint #${req.params.id} Update`;
    const userNotificationMessage = status === 'Awaiting Materials'
      ? `OCMS needs more information before continuing: ${notes}`
      : `Status updated to ${status} by Admin. ${notes || ''}`.trim();

    await createNotification(pool, {
      title: userNotificationTitle,
      message: userNotificationMessage,
      target: 'Users',
      recipientType: 'User',
      recipientId: complaints[0].user_id,
      priority: status === 'Awaiting Materials' ? 'Important' : 'Normal'
    });

    await notifyAssignedOfficer(
      complaints[0],
      status === 'Awaiting Materials' ? `Information requested for complaint #${req.params.id}` : `Complaint #${req.params.id} Update`,
      status === 'Awaiting Materials' ? `Admin asked the citizen for more information: ${notes}` : `Status updated to ${status} by Admin. ${notes || ''}`.trim(),
      ['Awaiting Materials', 'Escalated', 'Rejected', 'Closed'].includes(status) ? 'Important' : 'Normal'
    );

    res.json({ message: 'Complaint status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.put('/complaints/:id/reopen', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const { reason } = req.body;
    const requiredError = validateRequired({ reason });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const [complaints] = await pool.query(
      'SELECT id, user_id, assigned_officer_id, status FROM complaints WHERE id = ? AND is_trashed = FALSE',
      [req.params.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    if (!isTerminalComplaintStatus(complaints[0].status)) {
      return res.status(400).json({ error: `Only terminal complaints can be reopened. Current status is ${complaints[0].status}` });
    }

    const [result] = await pool.query(
      `UPDATE complaints SET
        status = 'Reopened',
        sla_started_at = ${nowSql()},
        sla_deadline = ${deadlineSql('priority', nowSql())},
        sla_breached = FALSE,
        updated_at = NOW()
       WHERE id = ?`,
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, 'Reopened by Admin', 'Admin', reason]
    );
    await syncEscalationQueue(req.params.id);

    await createNotification(pool, {
      title: `Complaint #${req.params.id} Reopened`,
      message: `Your complaint has been reopened by Admin. Reason: ${reason}`,
      target: 'Users',
      recipientType: 'User',
      recipientId: complaints[0].user_id,
      priority: 'Important'
    });

    await notifyAssignedOfficer(
      complaints[0],
      `Complaint #${req.params.id} Reopened`,
      `Admin reopened this complaint. Reason: ${reason}`,
      'Important'
    );

    res.json({ message: 'Complaint reopened' });
  } catch (err) {
    console.error('Reopen complaint error:', err);
    res.status(500).json({ error: 'Failed to reopen complaint' });
  }
});

router.put('/complaints/:id/priority', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const { priority } = req.body;
    const priorityError = validateEnum(priority, PRIORITIES, 'Priority');
    if (priorityError) return res.status(400).json({ error: priorityError });

    const [complaints] = await pool.query(
      'SELECT id, status FROM complaints WHERE id = ? AND is_trashed = FALSE',
      [req.params.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    if (isTerminalComplaintStatus(complaints[0].status)) {
      return res.status(400).json({ error: `Priority cannot be changed after a complaint is ${complaints[0].status}` });
    }

    const [result] = await pool.query(
      `UPDATE complaints SET
        priority = ?,
        sla_started_at = CASE
          WHEN status IN ('Assigned', 'In Progress', 'Awaiting Materials', 'Reopened')
            AND sla_started_at IS NULL
          THEN ${nowSql()}
          ELSE sla_started_at
        END,
        sla_deadline = CASE
          WHEN status IN ('Assigned', 'In Progress', 'Awaiting Materials', 'Reopened')
            AND sla_breached = FALSE
          THEN ${deadlineSql('?', `COALESCE(sla_started_at, ${nowSql()})`)}
          ELSE sla_deadline
        END,
        updated_at = NOW()
       WHERE id = ?`,
      [priority, priority, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor) VALUES (?, ?, ?)',
      [req.params.id, `Priority Update: ${priority}`, 'Admin']
    );
    await syncEscalationQueue(req.params.id);
    res.json({ message: 'Priority updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const [byDept] = await pool.query(
      `SELECT d.name, COUNT(c.id) as count FROM departments d LEFT JOIN complaints c ON c.department_id = d.id GROUP BY d.id, d.name`
    );

    const [byStatus] = await pool.query(
      `SELECT status, COUNT(*) as count FROM complaints GROUP BY status`
    );

    const [totals] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status IN ('Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Reopened') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN sla_breached = TRUE THEN 1 ELSE 0 END) as sla_breached
      FROM complaints WHERE is_trashed = FALSE
    `);

    const [performanceRows] = await pool.query(`
      SELECT
        COALESCE(hl.id, 'unassigned') as id,
        COALESCE(hl.name, 'Unassigned') as name,
        COUNT(c.id) as total,
        SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN c.sla_breached = TRUE THEN 1 ELSE 0 END) as breaches,
        AVG(CASE
          WHEN c.status IN ('Resolved', 'Closed')
          THEN TIMESTAMPDIFF(HOUR, c.created_at, c.updated_at) / 24
          ELSE NULL
        END) as avg_resolution_days
      FROM complaints c
      LEFT JOIN hierarchy_levels hl ON c.current_hierarchy_level_id = hl.id
      WHERE c.is_trashed = FALSE
      GROUP BY COALESCE(hl.id, 'unassigned'), COALESCE(hl.name, 'Unassigned')
      ORDER BY name
    `);

    const performance = performanceRows.map((row) => {
      const avgDays = row.avg_resolution_days == null
        ? 'N/A'
        : `${Number(row.avg_resolution_days).toFixed(1)} days`;
      const total = Number(row.total || 0);
      const breaches = Number(row.breaches || 0);
      const efficiency = total === 0 ? 'N/A' : `${Math.max(0, Math.round(((total - breaches) / total) * 100))}%`;

      return {
        id: row.id,
        name: row.name,
        avgDays,
        breaches,
        efficiency
      };
    });

    res.json({ byDept, byStatus, totals: totals[0], performance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Notifications
router.get('/notifications', async (req, res) => {
  try {
    const [[adminAccount]] = await pool.query('SELECT created_at FROM officers WHERE id = ?', [req.user.id]);
    const adminCreatedAt = adminAccount?.created_at || new Date(0);
    const [notifications] = await pool.query(
      `SELECT n.*, nr.read_at,
        CASE
          WHEN (
            (n.recipient_type IS NULL AND n.target IN ('All', 'Officers') AND n.created_at >= ?)
            OR (n.recipient_type = 'Officer' AND n.recipient_id = ?)
          ) THEN 1
          ELSE 0
        END as is_visible_to_admin
       FROM notifications n
       LEFT JOIN notification_reads nr
         ON nr.notification_id = n.id
         AND nr.recipient_type = 'Officer'
         AND nr.recipient_id = ?
       ORDER BY n.created_at DESC`,
      [adminCreatedAt, req.user.id, req.user.id]
    );

    res.json(notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      target: n.target,
      recipientType: n.recipient_type,
      recipientId: n.recipient_id,
      priority: n.priority,
      date: n.created_at,
      read: !n.is_visible_to_admin || Boolean(n.read_at)
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    const marked = await markNotificationRead(pool, 'admin', req.user.id, req.params.id);
    if (!marked) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.post('/notifications', async (req, res) => {
  try {
    const { title, message, target, priority } = req.body;
    const requiredError = validateRequired({ title, message, target });
    if (requiredError) return res.status(400).json({ error: requiredError });
    const targetError = validateEnum(target, NOTIFICATION_TARGETS, 'Target');
    if (targetError) return res.status(400).json({ error: targetError });
    const finalPriority = priority || 'Normal';
    const priorityError = validateEnum(finalPriority, NOTIFICATION_PRIORITIES, 'Priority');
    if (priorityError) return res.status(400).json({ error: priorityError });

    const notification = await createNotification(pool, {
      title,
      message,
      target,
      priority: finalPriority
    });
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

router.delete('/notifications', async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications');
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

module.exports = router;
