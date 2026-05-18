const jwt = require('jsonwebtoken');
const pool = require('../db/connection');

const roleAllowedForRoute = (actualRole, requiredRole) => {
  if (!requiredRole) return true;
  if (requiredRole === 'officer') return actualRole === 'officer' || actualRole === 'admin';
  return actualRole === requiredRole;
};

const assertActiveAccount = async (req, res) => {
  if (req.user.role === 'user') {
    const [users] = await pool.query(
      'SELECT id, name, email, status FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      res.status(401).json({ error: 'Account no longer exists' });
      return false;
    }

    if (users[0].status !== 'Active') {
      res.status(403).json({ error: `Account is ${users[0].status}. Access is not allowed.` });
      return false;
    }

    req.user.name = users[0].name;
    req.user.email = users[0].email;
    req.user.status = users[0].status;
    return true;
  }

  if (req.user.role === 'officer' || req.user.role === 'admin') {
    const [officers] = await pool.query(
      'SELECT id, name, email, role, status FROM officers WHERE id = ?',
      [req.user.id]
    );

    if (officers.length === 0) {
      res.status(401).json({ error: 'Account no longer exists' });
      return false;
    }

    const officer = officers[0];
    const dbRole = officer.role === 'Admin' ? 'admin' : 'officer';
    if (dbRole !== req.user.role) {
      res.status(403).json({ error: 'Account role has changed. Please log in again.' });
      return false;
    }

    if (officer.status !== 'Active') {
      res.status(403).json({ error: `Account is ${officer.status}. Access is not allowed.` });
      return false;
    }

    req.user.name = officer.name;
    req.user.email = officer.email;
    req.user.status = officer.status;
    return true;
  }

  res.status(403).json({ error: 'Invalid account role' });
  return false;
};

const authMiddleware = (requiredRole) => async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (!roleAllowedForRoute(req.user.role, requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const active = await assertActiveAccount(req, res);
    if (!active) return;

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
