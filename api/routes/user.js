const express = require('express');
const pool = require('../db/connection');
const authMiddleware = require('../middleware/auth');
const { createId } = require('../utils/id');
const { createNotification, getNotificationsFor, getUnreadNotificationCount, markNotificationRead } = require('../utils/notifications');
const { deadlineSql, nowSql, refreshSlaBreaches } = require('../utils/sla');
const { saveDataUrl, sendUploadError } = require('../utils/uploads');
const { validatePassword, validateRequired } = require('../utils/validation');
const { getEscalationScheduler } = require('../services/escalationScheduler');
const router = express.Router();

const USER_WITHDRAW_STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Reopened'];
const USER_MATERIAL_RESPONSE_STATUS = 'Awaiting Materials';

const syncEscalationQueue = async (complaintId) => {
  const scheduler = getEscalationScheduler();
  if (!scheduler) return;

  try {
    await scheduler.syncComplaintById(complaintId);
  } catch (err) {
    console.error(`Failed to sync escalation queue for complaint ${complaintId}:`, err);
  }
};

const notifyActiveAdmins = async ({ title, message, priority = 'Normal', excludeOfficerId = null }) => {
  const [admins] = await pool.query(
    "SELECT id FROM officers WHERE role = 'Admin' AND status = 'Active'"
  );

  await Promise.all(admins
    .filter(admin => admin.id !== excludeOfficerId)
    .map(admin => createNotification(pool, {
      title,
      message,
      target: 'Officers',
      recipientType: 'Officer',
      recipientId: admin.id,
      priority
    })));
};

const parseCoordinate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : NaN;
};

const validateCoordinates = (latitude, longitude) => {
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return 'Location coordinates must be valid numbers';
  }
  if ((latitude === null) !== (longitude === null)) {
    return 'Both latitude and longitude are required for map location';
  }
  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    return 'Latitude must be between -90 and 90';
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    return 'Longitude must be between -180 and 180';
  }
  return null;
};

router.use(authMiddleware('user'));

router.get('/attention', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const [[activeComplaints]] = await pool.query(
      `SELECT COUNT(*) as count FROM complaints
       WHERE user_id = ?
       AND is_trashed = FALSE
       AND status IN ('Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Resolved', 'Rejected', 'Reopened')`,
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

router.post('/complaints', async (req, res) => {
  try {
    const { title, description, departmentId, location, imageUrl } = req.body;
    const latitude = parseCoordinate(req.body.latitude);
    const longitude = parseCoordinate(req.body.longitude);

    const requiredError = validateRequired({ title, departmentId, description, location });
    if (requiredError) return res.status(400).json({ error: requiredError });
    const coordinateError = validateCoordinates(latitude, longitude);
    if (coordinateError) return res.status(400).json({ error: coordinateError });

    const [departments] = await pool.query(
      "SELECT id FROM departments WHERE id = ? AND status = 'Active'",
      [departmentId]
    );

    if (departments.length === 0) {
      return res.status(400).json({ error: 'Please select a valid active department' });
    }

    const evidenceUrl = await saveDataUrl(imageUrl, { req, folder: 'complaints/evidence' });
    const id = createId('C-');
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO complaints
          (id, title, description, department_id, user_id, location, latitude, longitude,
           image_url, priority, sla_started_at, sla_deadline, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Medium', NOW(), ${deadlineSql("'Medium'", 'NOW()')}, NOW(), NOW())`,
        [id, title.trim(), description.trim(), departmentId, req.user.id, location.trim(), latitude, longitude, evidenceUrl || null]
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

    await syncEscalationQueue(id);

    res.status(201).json({
      id, title: title.trim(), departmentId, userId: req.user.id, description: description.trim(), location: location.trim(), imageUrl: evidenceUrl,
      latitude, longitude,
      status: 'Submitted', priority: 'Medium', assignedOfficerId: null,
      currentHierarchyLevelId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      history: [{ date: new Date().toISOString(), action: 'Complaint Submitted', actor: req.user.name, details: 'Submitted via Citizen Portal' }]
    });
  } catch (err) {
    if (sendUploadError(res, err)) return;
    console.error('Lodge complaint error:', err);
    res.status(500).json({ error: 'Failed to lodge complaint' });
  }
});

router.put('/complaints/:id/withdraw', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const { reason } = req.body;
    const requiredError = validateRequired({ reason });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const [complaints] = await pool.query(
      'SELECT id, status, assigned_officer_id FROM complaints WHERE id = ? AND user_id = ? AND is_trashed = FALSE',
      [req.params.id, req.user.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    if (!USER_WITHDRAW_STATUSES.includes(complaints[0].status)) {
      return res.status(400).json({ error: `Cannot withdraw a complaint that is ${complaints[0].status}` });
    }

    const [result] = await pool.query(
      'UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ? AND status IN (?)',
      ['Withdrawn', req.params.id, req.user.id, USER_WITHDRAW_STATUSES]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, 'Withdrawn by User', req.user.name || 'User', reason]
    );
    await syncEscalationQueue(req.params.id);

    if (complaints[0].assigned_officer_id) {
      await createNotification(pool, {
        title: `Complaint #${req.params.id} Withdrawn`,
        message: `The citizen withdrew this complaint. Reason: ${reason}`,
        target: 'Officers',
        recipientType: 'Officer',
        recipientId: complaints[0].assigned_officer_id,
        priority: 'Important'
      });
    }

    res.json({ message: 'Complaint withdrawn' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to withdraw complaint' });
  }
});

router.put('/complaints/:id/materials', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const { materials } = req.body;
    const requiredError = validateRequired({ materials });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const materialDetails = materials.trim();
    const [complaints] = await pool.query(
      'SELECT id, status, assigned_officer_id FROM complaints WHERE id = ? AND user_id = ? AND is_trashed = FALSE',
      [req.params.id, req.user.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    if (complaints[0].status !== USER_MATERIAL_RESPONSE_STATUS) {
      return res.status(400).json({ error: 'You can respond only after an officer asks for more information.' });
    }
    if (!complaints[0].assigned_officer_id) {
      return res.status(400).json({ error: 'A response cannot be sent until an officer is assigned.' });
    }

    const [result] = await pool.query(
      `UPDATE complaints SET
        status = 'In Progress',
        sla_started_at = COALESCE(sla_started_at, ${nowSql()}),
        sla_deadline = CASE
          WHEN sla_deadline IS NULL THEN ${deadlineSql('priority', `COALESCE(sla_started_at, ${nowSql()})`)}
          ELSE sla_deadline
        END,
        updated_at = NOW()
       WHERE id = ? AND user_id = ? AND status = ?`,
      [req.params.id, req.user.id, USER_MATERIAL_RESPONSE_STATUS]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, 'Citizen response sent', req.user.name || 'User', materialDetails]
    );
    await syncEscalationQueue(req.params.id);

    const notificationTitle = `Citizen response received for complaint #${req.params.id}`;
    const notificationMessage = `${req.user.name || 'The citizen'} responded to the request for more information: ${materialDetails}`;

    await createNotification(pool, {
      title: notificationTitle,
      message: notificationMessage,
      target: 'Officers',
      recipientType: 'Officer',
      recipientId: complaints[0].assigned_officer_id,
      priority: 'Important'
    });

    await notifyActiveAdmins({
      title: notificationTitle,
      message: notificationMessage,
      priority: 'Important',
      excludeOfficerId: complaints[0].assigned_officer_id
    });

    res.json({ message: 'Response sent to officer and admin' });
  } catch (err) {
    console.error('Provide materials error:', err);
    res.status(500).json({ error: 'Failed to send response' });
  }
});

router.put('/complaints/:id/accept-resolution', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const [complaints] = await pool.query(
      'SELECT id, status, assigned_officer_id FROM complaints WHERE id = ? AND user_id = ? AND is_trashed = FALSE',
      [req.params.id, req.user.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    if (complaints[0].status !== 'Resolved') {
      return res.status(400).json({ error: `Only resolved complaints can be accepted. Current status is ${complaints[0].status}` });
    }

    const [result] = await pool.query(
      "UPDATE complaints SET status = 'Closed', updated_at = NOW() WHERE id = ? AND user_id = ? AND status = 'Resolved'",
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, 'Resolution Accepted by User', req.user.name || 'User', 'Citizen accepted the resolution and closed the complaint.']
    );
    await syncEscalationQueue(req.params.id);

    if (complaints[0].assigned_officer_id) {
      await createNotification(pool, {
        title: `Complaint #${req.params.id} Closed`,
        message: 'The citizen accepted the resolution and closed this complaint.',
        target: 'Officers',
        recipientType: 'Officer',
        recipientId: complaints[0].assigned_officer_id
      });
    }

    res.json({ message: 'Resolution accepted and complaint closed' });
  } catch (err) {
    console.error('Accept resolution error:', err);
    res.status(500).json({ error: 'Failed to accept resolution' });
  }
});

router.put('/complaints/:id/reopen', async (req, res) => {
  try {
    await refreshSlaBreaches(pool);

    const { reason } = req.body;
    const requiredError = validateRequired({ reason });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const [complaints] = await pool.query(
      'SELECT id, status, assigned_officer_id FROM complaints WHERE id = ? AND user_id = ? AND is_trashed = FALSE',
      [req.params.id, req.user.id]
    );
    if (complaints.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    if (complaints[0].status !== 'Resolved') {
      return res.status(400).json({ error: `Only resolved complaints can be reopened by the citizen. Current status is ${complaints[0].status}` });
    }

    const [result] = await pool.query(
      `UPDATE complaints SET
        status = 'Reopened',
        sla_started_at = ${nowSql()},
        sla_deadline = ${deadlineSql('priority', nowSql())},
        sla_breached = FALSE,
        updated_at = NOW()
       WHERE id = ? AND user_id = ? AND status = 'Resolved'`,
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });

    await pool.query(
      'INSERT INTO complaint_history (complaint_id, action, actor, details) VALUES (?, ?, ?, ?)',
      [req.params.id, 'Reopened by User', req.user.name || 'User', reason]
    );
    await syncEscalationQueue(req.params.id);

    if (complaints[0].assigned_officer_id) {
      await createNotification(pool, {
        title: `Complaint #${req.params.id} Reopened`,
        message: `The citizen reopened this complaint. Reason: ${reason}`,
        target: 'Officers',
        recipientType: 'Officer',
        recipientId: complaints[0].assigned_officer_id,
        priority: 'Important'
      });
    }

    await createNotification(pool, {
      title: `Complaint #${req.params.id} Reopened`,
      message: `${req.user.name || 'A citizen'} reopened a resolved complaint. Reason: ${reason}`,
      target: 'Officers',
      priority: 'Important'
    });

    res.json({ message: 'Complaint reopened' });
  } catch (err) {
    console.error('User reopen complaint error:', err);
    res.status(500).json({ error: 'Failed to reopen complaint' });
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
    const marked = await markNotificationRead(pool, 'user', req.user.id, req.params.id);
    if (!marked) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { name, mobile, address, profilePicture, idCardUrl } = req.body;
    const profilePictureUrl = await saveDataUrl(profilePicture, { req, folder: 'users/profiles' });
    const idCardFileUrl = await saveDataUrl(idCardUrl, { req, folder: 'users/id-cards' });
    await pool.query(
      'UPDATE users SET name = COALESCE(?, name), mobile = COALESCE(?, mobile), address = COALESCE(?, address), profile_picture = COALESCE(?, profile_picture), id_card_url = COALESCE(?, id_card_url) WHERE id = ?',
      [name, mobile, address, profilePictureUrl, idCardFileUrl, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    if (sendUploadError(res, err)) return;
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const bcrypt = require('bcryptjs');
    const requiredError = validateRequired({ currentPassword, newPassword });
    if (requiredError) return res.status(400).json({ error: requiredError });

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
