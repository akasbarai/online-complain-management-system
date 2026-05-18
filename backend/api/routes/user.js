const express = require('express');
const pool = require('../db/connection');
const authMiddleware = require('../middleware/auth');
const { createId } = require('../utils/id');
const { createNotification, getNotificationsFor, getUnreadNotificationCount, markNotificationRead } = require('../utils/notifications');
const { validatePassword, validateRequired } = require('../utils/validation');
const { TERMINAL_STATUSES, refreshSlaBreaches } = require('../utils/workflow');
const router = express.Router();

router.use(authMiddleware('user'));

router.get('/attention', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);
    const [[activeComplaints]] = await pool.query(
      `SELECT COUNT(*) as count FROM complaints
       WHERE user_id = ?
       AND is_trashed = FALSE
       AND status IN ('Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Resolved', 'Rejected', 'Withdrawn')`,
      [req.user.id]
    );
    const notifications = await getUnreadNotificationCount(pool, 'user', req.user.id);
    const [[profile]] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE id = ? AND (mobile IS NULL OR mobile = '' OR address IS NULL OR address = '' OR id_card_url IS NULL OR id_card_url = '')",
      [req.user.id]
    );

    res.json({
      notifications,
      dashboard: activeComplaints.count,
      complaints: activeComplaints.count,
      profile: profile.count
    });
  } catch (err) {
    console.error('User attention error:', err);
    res.status(500).json({ error: 'Failed to fetch attention summary' });
  }
});

router.get('/complaints', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);
    const [complaints] = await pool.query(`
      SELECT c.*, d.name as department_name, o.name as officer_name
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN officers o ON c.assigned_officer_id = o.id
      WHERE c.user_id = ? AND c.is_trashed = FALSE
      ORDER BY c.created_at DESC
    `, [req.user.id]);

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
      category: c.department_name,
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

router.get('/complaints/:id', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);
    const [complaints] = await pool.query(`
      SELECT c.*, d.name as department_name, o.name as officer_name, hl.name as hierarchy_name
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN officers o ON c.assigned_officer_id = o.id
      LEFT JOIN hierarchy_levels hl ON c.current_hierarchy_level_id = hl.id
      WHERE c.id = ? AND c.user_id = ? AND c.is_trashed = FALSE
    `, [req.params.id, req.user.id]);

    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });

    const [history] = await pool.query(
      'SELECT * FROM complaint_history WHERE complaint_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );

    const c = complaints[0];
    res.json({
      id: c.id,
      title: c.title,
      departmentId: c.department_id,
      category: c.department_name,
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
      history: history.map(h => ({ date: h.created_at, action: h.action, actor: h.actor, details: h.details }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

router.post('/complaints', async (req, res) => {
  try {
    const { title, description, departmentId, location, imageUrl } = req.body;

    const requiredError = validateRequired({ title, departmentId, description, location });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const [departments] = await pool.query(
      "SELECT id FROM departments WHERE id = ? AND status = 'Active'",
      [departmentId]
    );

    if (departments.length === 0) {
      return res.status(400).json({ error: 'Please select a valid active department' });
    }

    const id = createId('C-');
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO complaints (id, title, description, department_id, user_id, location, image_url, priority, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Medium', NOW(), NOW())`,
        [id, title.trim(), description.trim(), departmentId, req.user.id, location.trim(), imageUrl || null]
      );

      await connection.query(
        'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
        [id, 'Complaint Submitted', req.user.name, 'Submitted via Citizen Portal']
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    await createNotification(pool, {
      title: 'New Complaint Submitted',
      message: `${req.user.name} submitted complaint #${id}: ${title.trim()}`,
      target: 'Admins',
      priority: 'Important'
    });

    res.status(201).json({
      id, title: title.trim(), departmentId, userId: req.user.id, description: description.trim(), location: location.trim(), imageUrl,
      status: 'Submitted', priority: 'Medium', assignedOfficerId: null,
      currentHierarchyLevelId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      history: [{ date: new Date().toISOString(), action: 'Complaint Submitted', actor: req.user.name, details: 'Submitted via Citizen Portal' }]
    });
  } catch (err) {
    console.error('Lodge complaint error:', err);
    res.status(500).json({ error: 'Failed to lodge complaint' });
  }
});

router.put('/complaints/:id/withdraw', async (req, res) => {
  try {
    const { reason } = req.body;
    const requiredError = validateRequired({ reason });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const [complaints] = await pool.query(
      `SELECT id, title, status, assigned_officer_id
       FROM complaints
       WHERE id = ? AND user_id = ? AND is_trashed = FALSE`,
      [req.params.id, req.user.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    const complaint = complaints[0];

    if (TERMINAL_STATUSES.includes(complaint.status)) {
      return res.status(400).json({ error: `Cannot withdraw a ${complaint.status} complaint` });
    }

    const [result] = await pool.query(
      `UPDATE complaints
       SET status = ?, assigned_officer_id = NULL, sla_deadline = NULL, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      ['Withdrawn', req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, 'Withdrawn by User', 'User', reason]
    );

    if (complaint.assigned_officer_id) {
      await createNotification(pool, {
        title: `Complaint #${req.params.id} Withdrawn`,
        message: `${req.user.name} withdrew this complaint. Reason: ${reason}`,
        target: 'Officers',
        recipientType: 'Officer',
        recipientId: complaint.assigned_officer_id,
        priority: 'Important'
      });
    }

    await createNotification(pool, {
      title: `Complaint #${req.params.id} Withdrawn`,
      message: `${req.user.name} withdrew complaint "${complaint.title}". Reason: ${reason}`,
      target: 'Admins',
      priority: 'Important'
    });

    res.json({ message: 'Complaint withdrawn' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to withdraw complaint' });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const notifications = await getNotificationsFor(pool, 'user', req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    await markNotificationRead(pool, 'user', req.user.id, req.params.id);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { name, mobile, address, profilePicture, idCardUrl } = req.body;
    await pool.query(
      'UPDATE users SET name = COALESCE(?, name), mobile = COALESCE(?, mobile), address = COALESCE(?, address), profile_picture = COALESCE(?, profile_picture), id_card_url = COALESCE(?, id_card_url) WHERE id = ?',
      [name, mobile, address, profilePicture, idCardUrl, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const bcrypt = require('bcryptjs');
    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, mobile, address, status, profile_picture, id_card_url, registered_date FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const u = users[0];
    res.json({
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      address: u.address,
      status: u.status,
      profilePicture: u.profile_picture,
      idCardUrl: u.id_card_url,
      registeredDate: u.registered_date
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user status' });
  }
});

module.exports = router;
