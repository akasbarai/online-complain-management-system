const buckets = new Map();

const rateLimit = ({ windowMs, max, keyPrefix = 'global' }) => (req, res, next) => {
  const now = Date.now();
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const key = `${keyPrefix}:${ip}`;
  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > max) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  next();
};

module.exports = rateLimit;
