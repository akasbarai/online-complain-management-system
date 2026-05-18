const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');
const authMiddleware = require('../middleware/auth');
const { createId } = require('../utils/id');
const { createNotification, getNotificationsFor, getUnreadNotificationCount, markNotificationRead } = require('../utils/notifications');
const {
  TERMINAL_STATUSES,
  getSlaDeadline,
  refreshSlaBreaches,
  validateStatusTransition
} = require('../utils/workflow');
const {
  isValidEmail,
  normalizeEmail,
  validateEnum,
  validateRequired
} = require('../utils/validation');
const router = express.Router();

const USER_STATUSES = ['Active', 'Inactive', 'Blocked', 'Pending'];
const COMPLAINT_STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Resolved', 'Closed', 'Rejected'];
const PRIORITIES = ['Unassigned', 'Low', 'Medium', 'High', 'Critical'];
const NOTIFICATION_TARGETS = ['All', 'Users', 'Officers', 'Admins'];
const NOTIFICATION_PRIORITIES = ['Normal', 'Important', 'Urgent'];

router.use(authMiddleware('admin'));

router.get('/attention', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);
    const [[pendingUsers]] = await pool.query("SELECT COUNT(*) as count FROM users WHERE status = 'Pending'");
    const [[passwordResetRequests]] = await pool.query('SELECT COUNT(*) as count FROM users WHERE password_reset_requested = TRUE');
    const [[unassignedComplaints]] = await pool.query(
      "SELECT COUNT(*) as count FROM complaints WHERE assigned_officer_id IS NULL AND is_trashed = FALSE"
    );
    const [[escalatedComplaints]] = await pool.query(
      "SELECT COUNT(*) as count FROM complaints WHERE status = 'Escalated' AND is_trashed = FALSE"
    );
    const [[slaBreachedComplaints]] = await pool.query(
      `SELECT COUNT(*) as count FROM complaints
       WHERE is_trashed = FALSE
       AND status NOT IN ('Resolved', 'Closed', 'Rejected')
       AND (sla_breached = TRUE OR (sla_deadline IS NOT NULL AND sla_deadline < NOW()))`
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
      users: pendingUsers.count + passwordResetRequests.count,
      pendingUsers: pendingUsers.count,
      passwordResetRequests: passwordResetRequests.count,
      complaints: unassignedComplaints.count + escalatedComplaints.count + slaBreachedComplaints.count,
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
    await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
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
    await pool.query('DELETE FROM hierarchy_levels WHERE id = ?', [req.params.id]);
    res.json({ message: 'Hierarchy level deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete hierarchy level' });
  }
});

// Escalation rules
router.get('/escalation-rules', async (req, res) => {
  try {
    const [rules] = await pool.query('SELECT * FROM escalation_rules ORDER BY department_id, hierarchy_level_id');
    res.json(rules.map(r => ({
      id: r.id,
      departmentId: r.department_id,
      hierarchyLevelId: r.hierarchy_level_id,
      timeLimitHours: r.time_limit_hours,
      targetLevelId: r.target_level_id
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch escalation rules' });
  }
});

router.post('/escalation-rules', async (req, res) => {
  try {
    const { departmentId, hierarchyLevelId, timeLimitHours, targetLevelId } = req.body;
    const requiredError = validateRequired({ departmentId, hierarchyLevelId, targetLevelId });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const hours = Number(timeLimitHours);
    if (!Number.isInteger(hours) || hours <= 0) {
      return res.status(400).json({ error: 'Time limit must be a positive whole number of hours' });
    }

    const id = createId('er-');
    await pool.query(
      `INSERT INTO escalation_rules (id, department_id, hierarchy_level_id, time_limit_hours, target_level_id)
       VALUES (?, ?, ?, ?, ?)`,
      [id, departmentId, hierarchyLevelId, hours, targetLevelId]
    );

    res.status(201).json({ id, departmentId, hierarchyLevelId, timeLimitHours: hours, targetLevelId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create escalation rule' });
  }
});

router.put('/escalation-rules/:id', async (req, res) => {
  try {
    const { timeLimitHours, targetLevelId } = req.body;
    const hours = Number(timeLimitHours);
    if (!Number.isInteger(hours) || hours <= 0) {
      return res.status(400).json({ error: 'Time limit must be a positive whole number of hours' });
    }
    const requiredError = validateRequired({ targetLevelId });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const [result] = await pool.query(
      'UPDATE escalation_rules SET time_limit_hours = ?, target_level_id = ? WHERE id = ?',
      [hours, targetLevelId, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Escalation rule not found' });

    res.json({ message: 'Escalation rule updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update escalation rule' });
  }
});

router.delete('/escalation-rules/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM escalation_rules WHERE id = ?', [req.params.id]);
    res.json({ message: 'Escalation rule deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete escalation rule' });
  }
});

// Officers
router.get('/officers', async (req, res) => {
  try {
    const [officers] = await pool.query(`
      SELECT o.*,
        SUM(CASE WHEN c.id IS NOT NULL AND c.status NOT IN ('Resolved', 'Closed', 'Rejected') AND c.is_trashed = FALSE THEN 1 ELSE 0 END) AS active_complaint_count,
        SUM(CASE WHEN c.id IS NOT NULL AND c.status = 'Assigned' AND c.is_trashed = FALSE THEN 1 ELSE 0 END) AS new_assignment_count,
        SUM(CASE WHEN c.id IS NOT NULL AND c.sla_deadline IS NOT NULL AND c.sla_deadline <= DATE_ADD(NOW(), INTERVAL 24 HOUR) AND c.status NOT IN ('Resolved', 'Closed', 'Rejected') AND c.is_trashed = FALSE THEN 1 ELSE 0 END) AS sla_risk_count
      FROM officers o
      LEFT JOIN complaints c ON c.assigned_officer_id = o.id
      WHERE o.role != 'Admin'
      GROUP BY o.id
    `);
    res.json(officers.map(o => ({
      id: o.id,
      name: o.name,
      email: o.email,
      departmentId: o.department_id,
      hierarchyLevelId: o.hierarchy_level_id,
      role: o.role,
      jurisdiction: o.jurisdiction,
      status: o.status,
      profilePhoto: o.profile_photo,
      workload: {
        active: Number(o.active_complaint_count || 0),
        newAssignments: Number(o.new_assignment_count || 0),
        slaRisk: Number(o.sla_risk_count || 0)
      }
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

router.post('/officers/:id/password-reset-link', async (req, res) => {
  try {
    const [officers] = await pool.query(
      "SELECT id, email FROM officers WHERE id = ? AND role != 'Admin'",
      [req.params.id]
    );
    if (officers.length === 0) return res.status(404).json({ error: 'Officer not found' });

    const token = jwt.sign(
      { id: officers[0].id, email: officers[0].email, accountType: 'officer', purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, email: officers[0].email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create officer password reset link' });
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
    await pool.query('DELETE FROM officers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Officer deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete officer' });
  }
});

// Users
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, email, mobile, address, status, password_reset_requested, password_reset_requested_at,
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
      passwordResetRequested: u.password_reset_requested === 1,
      passwordResetRequestedAt: u.password_reset_requested_at,
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
    await pool.query('UPDATE users SET status = ? WHERE id = ?', ['Active', req.params.id]);
    res.json({ message: 'User verified successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

router.post('/users/:id/password-reset-link', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, email FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const token = jwt.sign(
      { id: users[0].id, email: users[0].email, accountType: 'user', purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await pool.query(
      'UPDATE users SET password_reset_requested = FALSE, password_reset_requested_at = NULL WHERE id = ?',
      [users[0].id]
    );

    res.json({ token, email: users[0].email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create password reset link' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
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
      imageUrl: c.image_url,
      status: c.status,
      priority: c.priority,
      assignedOfficerId: c.assigned_officer_id,
      currentHierarchyLevelId: c.current_hierarchy_level_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      slaDeadline: c.sla_deadline,
      slaBreached: c.sla_breached === 1,
      history: history.filter(h => h.complaint_id === c.id).map(h => ({
        date: h.created_at,
        action: h.action,
        actor: h.actor
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
    const { officerId, reason } = req.body;
    const requiredError = validateRequired({ officerId, reason });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const [officers] = await pool.query("SELECT hierarchy_level_id FROM officers WHERE id = ? AND role != 'Admin' AND status = 'Active'", [officerId]);
    if (officers.length === 0) return res.status(404).json({ error: 'Officer not found' });

    const [complaints] = await pool.query(
      `SELECT id, title, user_id, department_id, status, assigned_officer_id
       FROM complaints
       WHERE id = ? AND is_trashed = FALSE`,
      [req.params.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });

    const complaint = complaints[0];
    if (TERMINAL_STATUSES.includes(complaint.status)) {
      return res.status(400).json({ error: `Cannot reassign a ${complaint.status} complaint` });
    }

    const nextStatus = ['Submitted', 'Under Review', 'Escalated'].includes(complaint.status)
      ? 'Assigned'
      : complaint.status;
    const transitionError = validateStatusTransition(complaint.status, nextStatus);
    if (transitionError) {
      return res.status(400).json({ error: transitionError });
    }

    const oldOfficerId = complaint.assigned_officer_id;
    const slaDeadline = await getSlaDeadline(pool, complaint.department_id, officers[0].hierarchy_level_id);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE complaints SET 
        assigned_officer_id = ?, 
        current_hierarchy_level_id = ?,
        status = ?,
        sla_deadline = ?,
        sla_breached = FALSE,
        updated_at = NOW()
       WHERE id = ?`,
        [officerId, officers[0].hierarchy_level_id, nextStatus, slaDeadline, req.params.id]
      );

      await connection.query(
        'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
        [req.params.id, `${oldOfficerId ? 'Reassigned' : 'Assigned'}: ${reason}`, 'Admin', reason]
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    if (oldOfficerId && oldOfficerId !== officerId) {
      await createNotification(pool, {
        title: 'Complaint Reassigned',
        message: `Complaint #${req.params.id} has been reassigned away from you. Reason: ${reason}`,
        target: 'Officers',
        recipientType: 'Officer',
        recipientId: oldOfficerId,
        priority: 'Important'
      });
    }

    await createNotification(pool, {
      title: 'New Complaint Assigned',
      message: `Complaint #${req.params.id} has been assigned to you.`,
      target: 'Officers',
      recipientType: 'Officer',
      recipientId: officerId
    });

    await createNotification(pool, {
      title: `Complaint #${req.params.id} Assigned`,
      message: 'Your complaint has been assigned to an officer for action.',
      target: 'Users',
      recipientType: 'User',
      recipientId: complaint.user_id
    });

    res.json({ message: 'Complaint reassigned' });
  } catch (err) {
    console.error('Reassign error:', err);
    res.status(500).json({ error: 'Failed to reassign complaint' });
  }
});

router.put('/complaints/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const statusError = validateEnum(status, COMPLAINT_STATUSES, 'Status');
    if (statusError) return res.status(400).json({ error: statusError });

    const [complaints] = await pool.query('SELECT status FROM complaints WHERE id = ? AND is_trashed = FALSE', [req.params.id]);
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });

    const transitionError = validateStatusTransition(complaints[0].status, status);
    if (transitionError) return res.status(400).json({ error: transitionError });

    const [result] = await pool.query(
      `UPDATE complaints SET 
        status = ?,
        updated_at = NOW()
       WHERE id = ? AND is_trashed = FALSE`,
      [status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, `Status Update: ${status}${notes ? ` - ${notes}` : ''}`, 'Admin', notes || '']
    );

    res.json({ message: 'Complaint status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.put('/complaints/:id/priority', async (req, res) => {
  try {
    const { priority } = req.body;
    const priorityError = validateEnum(priority, PRIORITIES, 'Priority');
    if (priorityError) return res.status(400).json({ error: priorityError });

    await pool.query('UPDATE complaints SET priority = ?, updated_at = NOW() WHERE id = ?', [priority, req.params.id]);
    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor) VALUES (?, ?, ?)',
      [req.params.id, `Priority Update: ${priority}`, 'Admin']
    );
    res.json({ message: 'Priority updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
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
        SUM(CASE WHEN status IN ('Submitted', 'Escalated') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN sla_breached = TRUE THEN 1 ELSE 0 END) as sla_breached
      FROM complaints WHERE is_trashed = FALSE
    `);

    res.json({ byDept, byStatus, totals: totals[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Notifications
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await getNotificationsFor(pool, 'admin', req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
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
    res.status(201).json({ ...notification, date: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    await markNotificationRead(pool, 'admin', req.user.id, req.params.id);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
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
