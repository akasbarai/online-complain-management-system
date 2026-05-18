const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/connection');
const authMiddleware = require('../middleware/auth');
const { createId } = require('../utils/id');
const { getNotificationsFor, getUnreadNotificationCount, markNotificationRead } = require('../utils/notifications');
const { validateEnum, validatePassword, validateRequired } = require('../utils/validation');
const router = express.Router();

const COMPLAINT_STATUSES = ['Under Review', 'In Progress', 'Awaiting Materials', 'Resolved', 'Rejected'];

router.use(authMiddleware('officer'));

router.get('/attention', async (req, res) => {
  try {
    const [[assigned]] = await pool.query(
      "SELECT COUNT(*) as count FROM complaints WHERE assigned_officer_id = ? AND status = 'Assigned' AND is_trashed = FALSE",
      [req.user.id]
    );
    const [[escalated]] = await pool.query(
      "SELECT COUNT(*) as count FROM complaints WHERE assigned_officer_id = ? AND status = 'Escalated' AND is_trashed = FALSE",
      [req.user.id]
    );
    const [[slaRisk]] = await pool.query(
      `SELECT COUNT(*) as count FROM complaints
       WHERE assigned_officer_id = ?
       AND is_trashed = FALSE
       AND status NOT IN ('Resolved', 'Closed', 'Rejected')
       AND sla_deadline IS NOT NULL
       AND sla_deadline <= DATE_ADD(NOW(), INTERVAL 24 HOUR)`,
      [req.user.id]
    );
    const notifications = await getUnreadNotificationCount(pool, 'officer', req.user.id);
    const [[profile]] = await pool.query(
      "SELECT COUNT(*) as count FROM officers WHERE id = ? AND (hierarchy_level_id IS NULL OR jurisdiction IS NULL OR jurisdiction = '')",
      [req.user.id]
    );

    res.json({
      notifications,
      complaints: assigned.count + escalated.count + slaRisk.count,
      newAssignments: assigned.count,
      escalatedComplaints: escalated.count,
      slaRiskComplaints: slaRisk.count,
      profile: profile.count
    });
  } catch (err) {
    console.error('Officer attention error:', err);
    res.status(500).json({ error: 'Failed to fetch attention summary' });
  }
});

router.get('/complaints', async (req, res) => {
  try {
    const [complaints] = await pool.query(`
      SELECT c.*, u.name as user_name, d.name as department_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.assigned_officer_id = ? AND c.is_trashed = FALSE
      ORDER BY c.created_at DESC
    `, [req.user.id]);

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
      slaBreached: c.sla_breached === 1
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching complaints:', err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

router.get('/complaints/:id', async (req, res) => {
  try {
    const [complaints] = await pool.query(`
      SELECT c.*, u.name as user_name, u.email as user_email, d.name as department_name,
        hl.name as hierarchy_name, o.name as officer_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN hierarchy_levels hl ON c.current_hierarchy_level_id = hl.id
      LEFT JOIN officers o ON c.assigned_officer_id = o.id
      WHERE c.id = ? AND c.assigned_officer_id = ? AND c.is_trashed = FALSE
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
      history: history.map(h => ({ date: h.created_at, action: h.action, actor: h.actor, details: h.details }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

router.put('/complaints/:id/status', async (req, res) => {
  try {
    const { status, remark } = req.body;
    const statusError = validateEnum(status, COMPLAINT_STATUSES, 'Status');
    if (statusError) return res.status(400).json({ error: statusError });

    const [result] = await pool.query(
      'UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ? AND assigned_officer_id = ?',
      [status, req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, `Status updated to ${status}: ${remark}`, req.user.name || 'Officer', remark || '']
    );

    await pool.query(
      "INSERT INTO notifications (id, title, message, target) VALUES (?, ?, ?, 'Users')",
      [createId('n-'), `Complaint #${req.params.id} Update`, `Status updated to ${status} by ${req.user.name}. ${remark || ''}`]
    );

    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.put('/complaints/:id/escalate', async (req, res) => {
  try {
    const { reason } = req.body;
    const requiredError = validateRequired({ reason });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const [result] = await pool.query(
      'UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ? AND assigned_officer_id = ?',
      ['Escalated', req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, `Escalated: ${reason}`, req.user.name || 'Officer', reason]
    );

    await pool.query(
      "INSERT INTO notifications (id, title, message, target) VALUES (?, ?, ?, 'Users')",
      [createId('n-'), `Complaint #${req.params.id} Escalated`, `Officer ${req.user.name} has escalated your complaint. Reason: ${reason}`]
    );

    res.json({ message: 'Complaint escalated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to escalate complaint' });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const notifications = await getNotificationsFor(pool, 'officer', req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    await markNotificationRead(pool, 'officer', req.user.id, req.params.id);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { name, profilePhoto } = req.body;
    await pool.query('UPDATE officers SET name = COALESCE(?, name), profile_photo = COALESCE(?, profile_photo) WHERE id = ?',
      [name, profilePhoto, req.user.id]);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE officers SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const [officers] = await pool.query(
      'SELECT id, name, email, department_id, hierarchy_level_id, role, jurisdiction, status, profile_photo FROM officers WHERE id = ?',
      [req.user.id]
    );
    if (officers.length === 0) return res.status(404).json({ error: 'Officer not found' });

    const o = officers[0];
    res.json({
      id: o.id,
      name: o.name,
      email: o.email,
      departmentId: o.department_id,
      hierarchyLevelId: o.hierarchy_level_id,
      role: o.role,
      jurisdiction: o.jurisdiction,
      status: o.status,
      profilePhoto: o.profile_photo
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch officer status' });
  }
});

module.exports = router;
