const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^98\d{8}$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeMobile = (mobile) => String(mobile || '').trim();

const isNonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

const isValidEmail = (email) => EMAIL_RE.test(normalizeEmail(email));
const isValidMobile = (mobile) => MOBILE_RE.test(normalizeMobile(mobile));

const validateRequired = (fields) => {
  const missing = Object.entries(fields)
    .filter(([, value]) => !isNonEmpty(value))
    .map(([key]) => key);

  return missing.length > 0 ? `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required` : null;
};

const validatePassword = (password) => {
  if (!isNonEmpty(password)) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
};

const validateEnum = (value, allowed, label) => {
  if (!allowed.includes(value)) return `${label} must be one of: ${allowed.join(', ')}`;
  return null;
};

module.exports = {
  isNonEmpty,
  isValidEmail,
  isValidMobile,
  normalizeMobile,
  normalizeEmail,
  validateEnum,
  validatePassword,
  validateRequired
};
