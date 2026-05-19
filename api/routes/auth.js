const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');
const { createId } = require('../utils/id');
const { createNotification } = require('../utils/notifications');
const {
  isValidEmail,
  isValidMobile,
  normalizeEmail,
  normalizeMobile,
  validatePassword,
  validateRequired
} = require('../utils/validation');
const router = express.Router();

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const generateToken = (user, role) => {
  return jwt.sign(
    { id: user.id, email: user.email, role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
};

const verifyResetToken = (token, expectedAccountType) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== 'password-reset' || decoded.accountType !== expectedAccountType || !decoded.id) {
    throw new Error('Invalid password reset link');
  }
  return decoded;
};

router.post('/user/register', async (req, res) => {
  try {
    const { name, email, mobile, address, password, profilePicture, idCardUrl } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedMobile = normalizeMobile(mobile);
    const requiredError = validateRequired({ name, email: normalizedEmail, mobile: normalizedMobile, address, password });
    if (requiredError) return res.status(400).json({ error: requiredError });
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({ error: 'A valid email is required' });
    if (!isValidMobile(normalizedMobile)) return res.status(400).json({ error: 'Phone number must start with 98 and be exactly 10 digits' });

    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const id = createId('u-');

    await pool.query(
      `INSERT INTO users (id, name, email, mobile, address, password_hash, status, profile_picture, id_card_url, registered_date)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, CURDATE())`,
      [id, name.trim(), normalizedEmail, normalizedMobile, address.trim(), passwordHash, profilePicture || null, idCardUrl || null]
    );

    res.status(201).json({
      message: 'Registration successful. Awaiting admin verification.',
      user: { id, name: name.trim(), email: normalizedEmail, mobile: normalizedMobile, address: address.trim(), status: 'Pending', registeredDate: new Date().toISOString().split('T')[0] }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/user/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const requiredError = validateRequired({ email: normalizedEmail, password });
    if (requiredError) return res.status(400).json({ error: requiredError });

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found. Please register.' });
    }

    const user = users[0];

    if (user.status === 'Pending') {
      return res.status(403).json({ error: 'Account verification pending.' });
    }
    if (user.status === 'Inactive') {
      return res.status(403).json({ error: 'Account inactive. Contact administrator.' });
    }
    if (user.status === 'Blocked') {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    const validPassword = await comparePassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = generateToken(user, 'user');

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        address: user.address,
        status: user.status,
        profilePicture: user.profile_picture,
        idCardUrl: user.id_card_url,
        registeredDate: user.registered_date
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/officer/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const requiredError = validateRequired({ email: normalizedEmail, password });
    if (requiredError) return res.status(400).json({ error: requiredError });
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({ error: 'A valid email is required' });

    const [officers] = await pool.query('SELECT * FROM officers WHERE email = ?', [normalizedEmail]);
    if (officers.length === 0) {
      return res.status(401).json({ error: 'Officer account not found.' });
    }

    const officer = officers[0];

    if (officer.status === 'Inactive') {
      return res.status(403).json({ error: 'Account inactive. Contact administrator.' });
    }
    if (officer.status === 'Pending') {
      return res.status(403).json({ error: 'Account verification pending.' });
    }
    if (officer.status === 'Blocked') {
      return res.status(403).json({ error: 'Account blocked. Access denied.' });
    }

    const validPassword = await comparePassword(password, officer.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = generateToken(officer, officer.role === 'Admin' ? 'admin' : 'officer');

    res.json({
      token,
      officer: {
        id: officer.id,
        name: officer.name,
        email: officer.email,
        departmentId: officer.department_id,
        hierarchyLevelId: officer.hierarchy_level_id,
        role: officer.role,
        jurisdiction: officer.jurisdiction,
        status: officer.status,
        profilePhoto: officer.profile_photo
      }
    });
  } catch (err) {
    console.error('Officer login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/user/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({ error: 'A valid email is required' });

    const [users] = await pool.query('SELECT id, name FROM users WHERE email = ?', [normalizedEmail]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'No account found with that email address.' });
    }

    const user = users[0];

    await pool.query(
      'UPDATE users SET password_reset_requested = TRUE, password_reset_requested_at = NOW() WHERE id = ?',
      [user.id]
    );

    await createNotification(pool, {
      title: 'Password Reset Requested',
      message: `${user.name} (${normalizedEmail}) requested a password reset.`,
      target: 'Officers',
      priority: 'Important'
    });

    res.json({ message: 'Password reset request sent to admin.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/user/reset-password/verify', async (req, res) => {
  try {
    verifyResetToken(req.body.token, 'user');
    res.json({ valid: true });
  } catch {
    res.status(400).json({ error: 'Invalid or expired password reset link' });
  }
});

router.put('/user/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    let decoded;
    try {
      decoded = verifyResetToken(token, 'user');
    } catch {
      return res.status(400).json({ error: 'Invalid or expired password reset link' });
    }

    const userId = decoded.id;
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid password reset link' });
    }

    const passwordHash = await hashPassword(newPassword);

    await pool.query(
      'UPDATE users SET password_hash = ?, password_reset_requested = FALSE, password_reset_requested_at = NULL WHERE id = ?',
      [passwordHash, userId]
    );

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.post('/officer/reset-password/verify', async (req, res) => {
  try {
    verifyResetToken(req.body.token, 'officer');
    res.json({ valid: true });
  } catch {
    res.status(400).json({ error: 'Invalid or expired password reset link' });
  }
});

router.put('/officer/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    let decoded;
    try {
      decoded = verifyResetToken(token, 'officer');
    } catch {
      return res.status(400).json({ error: 'Invalid or expired password reset link' });
    }

    const [officers] = await pool.query("SELECT id FROM officers WHERE id = ? AND role != 'Admin'", [decoded.id]);
    if (officers.length === 0) {
      return res.status(400).json({ error: 'Invalid password reset link' });
    }

    const passwordHash = await hashPassword(newPassword);
    await pool.query('UPDATE officers SET password_hash = ? WHERE id = ?', [passwordHash, decoded.id]);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Officer password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
