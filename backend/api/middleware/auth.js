const jwt = require('jsonwebtoken');

const authMiddleware = (requiredRole) => async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (requiredRole && req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
