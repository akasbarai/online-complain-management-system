const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/connection');
const authMiddleware = require('../middleware/auth');
const { createNotification, getNotificationsFor, getUnreadNotificationCount, markNotificationRead } = require('../utils/notifications');
const { deadlineSql, nowSql, refreshSlaBreaches } = require('../utils/sla');
const { saveDataUrl, sendUploadError } = require('../utils/uploads');
const { validateEnum, validatePassword, validateRequired } = require('../utils/validation');
const { getEscalationScheduler } = require('../services/escalationScheduler');
const router = express.Router();

const COMPLAINT_STATUSES = ['Under Review', 'In Progress', 'Awaiting Materials', 'Resolved', 'Rejected'];
const OFFICER_STATUS_TRANSITIONS = {
  Assigned: ['In Progress', 'Awaiting Materials', 'Resolved', 'Rejected'],
  'In Progress': ['Awaiting Materials', 'Resolved', 'Rejected'],
  'Awaiting Materials': ['In Progress', 'Resolved', 'Rejected'],
  Reopened: ['In Progress', 'Awaiting Materials', 'Resolved', 'Rejected'],
  Submitted: [],
  'Under Review': [],
  Escalated: [],
  Resolved: [],
  Closed: [],
  Rejected: [],
  Withdrawn: []
};

const canOfficerSetComplaintStatus = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return { allowed: false, reason: `Complaint is already ${nextStatus}` };
  }

  const allowedStatuses = OFFICER_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedStatuses.includes(nextStatus)) {
    return { allowed: false, reason: `Cannot change complaint from ${currentStatus} to ${nextStatus}` };
  }

  return { allowed: true };
};

const syncEscalationQueue = async (complaintId) => {
  const scheduler = getEscalationScheduler();
  if (!scheduler) return;

  try {
    await scheduler.syncComplaintById(complaintId);
  } catch (err) {
    console.error(`Failed to sync escalation queue for complaint ${complaintId}:`, err);
  }
};

router.use(authMiddleware('officer'));

router.get('/attention', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const [[assigned]] = await pool.query(
      "SELECT COUNT(*) as count FROM complaints WHERE assigned_officer_id = ? AND status IN ('Assigned', 'Reopened') AND is_trashed = FALSE",
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
       AND status NOT IN ('Resolved', 'Closed', 'Rejected', 'Withdrawn')
       AND sla_deadline IS NOT NULL
       AND sla_deadline <= DATE_ADD(${nowSql()}, INTERVAL 24 HOUR)`,
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
    await refreshSlaBreaches(pool);

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
    await refreshSlaBreaches(pool);

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
      history: history.map(h => ({ date: h.created_at, action: h.action, actor: h.actor, details: h.details }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

router.put('/complaints/:id/status', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const { status, remark } = req.body;
    const statusError = validateEnum(status, COMPLAINT_STATUSES, 'Status');
    if (statusError) return res.status(400).json({ error: statusError });

    const [complaints] = await pool.query(
      'SELECT id, user_id, status FROM complaints WHERE id = ? AND assigned_officer_id = ? AND is_trashed = FALSE',
      [req.params.id, req.user.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    const transition = canOfficerSetComplaintStatus(complaints[0].status, status);
    if (!transition.allowed) return res.status(400).json({ error: transition.reason });
    if (['Awaiting Materials', 'Rejected', 'Resolved'].includes(status) && !String(remark || '').trim()) {
      return res.status(400).json({ error: 'Remarks are required for this status update' });
    }

    const [result] = await pool.query(
      `UPDATE complaints SET
        status = ?,
        sla_started_at = CASE
          WHEN sla_started_at IS NULL AND ? IN ('In Progress', 'Awaiting Materials') THEN ${nowSql()}
          ELSE sla_started_at
        END,
        sla_deadline = CASE
          WHEN sla_deadline IS NULL AND ? IN ('In Progress', 'Awaiting Materials') THEN ${deadlineSql('priority', `COALESCE(sla_started_at, ${nowSql()})`)}
          ELSE sla_deadline
        END,
        updated_at = NOW()
       WHERE id = ? AND assigned_officer_id = ?`,
      [status, status, status, req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    const action = status === 'Awaiting Materials'
      ? 'More information requested from citizen'
      : `Status updated to ${status}: ${remark}`;
    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, action, req.user.name || 'Officer', remark || '']
    );
    await syncEscalationQueue(req.params.id);

    const notificationTitle = status === 'Awaiting Materials'
      ? `Action needed for complaint #${req.params.id}`
      : `Complaint #${req.params.id} Update`;
    const notificationMessage = status === 'Awaiting Materials'
      ? `${req.user.name || 'Your officer'} needs more information before continuing: ${remark}`
      : `Status updated to ${status} by ${req.user.name}. ${remark || ''}`.trim();

    await createNotification(pool, {
      title: notificationTitle,
      message: notificationMessage,
      target: 'Users',
      recipientType: 'User',
      recipientId: complaints[0].user_id,
      priority: status === 'Awaiting Materials' ? 'Important' : 'Normal'
    });

    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.put('/complaints/:id/escalate', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const { reason } = req.body;
    const requiredError = validateRequired({ reason });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const [complaints] = await pool.query(
      'SELECT id, user_id, status FROM complaints WHERE id = ? AND assigned_officer_id = ? AND is_trashed = FALSE',
      [req.params.id, req.user.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    if (!['Assigned', 'In Progress', 'Awaiting Materials', 'Reopened'].includes(complaints[0].status)) {
      return res.status(400).json({ error: `Cannot escalate a complaint that is ${complaints[0].status}` });
    }

    const [result] = await pool.query(
      'UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ? AND assigned_officer_id = ?',
      ['Escalated', req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, `Escalated: ${reason}`, req.user.name || 'Officer', reason]
    );
    await syncEscalationQueue(req.params.id);

    await createNotification(pool, {
      title: `Complaint #${req.params.id} Escalated`,
      message: `Officer ${req.user.name} has escalated your complaint. Reason: ${reason}`,
      target: 'Users',
      recipientType: 'User',
      recipientId: complaints[0].user_id
    });

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
    const marked = await markNotificationRead(pool, 'officer', req.user.id, req.params.id);
    if (!marked) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { name, profilePhoto } = req.body;
    const profilePhotoUrl = await saveDataUrl(profilePhoto, { req, folder: 'officers/profiles' });
    await pool.query('UPDATE officers SET name = COALESCE(?, name), profile_photo = COALESCE(?, profile_photo) WHERE id = ?',
      [name, profilePhotoUrl, req.user.id]);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    if (sendUploadError(res, err)) return;
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const requiredError = validateRequired({ currentPassword, newPassword });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const [officers] = await pool.query('SELECT password_hash FROM officers WHERE id = ?', [req.user.id]);
    if (officers.length === 0) return res.status(404).json({ error: 'Officer not found' });

    const valid = await bcrypt.compare(currentPassword, officers[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

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
      `SELECT o.id, o.name, o.email, o.department_id, o.hierarchy_level_id, o.role,
        o.jurisdiction, o.status, o.profile_photo,
        d.name as department_name,
        hl.name as hierarchy_name
       FROM officers o
       LEFT JOIN departments d ON o.department_id = d.id
       LEFT JOIN hierarchy_levels hl ON o.hierarchy_level_id = hl.id
       WHERE o.id = ?`,
      [req.user.id]
    );
    if (officers.length === 0) return res.status(404).json({ error: 'Officer not found' });

    const o = officers[0];
    res.json({
      id: o.id,
      name: o.name,
      email: o.email,
      departmentId: o.department_id,
      departmentName: o.department_name,
      hierarchyLevelId: o.hierarchy_level_id,
      designation: o.hierarchy_name,
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
