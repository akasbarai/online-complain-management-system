const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const configuredUploadDir = process.env.UPLOAD_DIR;
const UPLOAD_ROOT = configuredUploadDir
  ? (path.isAbsolute(configuredUploadDir)
    ? configuredUploadDir
    : path.join(__dirname, '..', configuredUploadDir))
  : path.join(__dirname, '..', 'uploads');

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf'
};

const DATA_URL_RE = /^data:([^;,]+);base64,(.+)$/;

const getPublicBaseUrl = (req) => {
  const configuredUrl = process.env.UPLOAD_BASE_URL || process.env.API_PUBLIC_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  return `${protocol}://${req.get('host')}`;
};

const saveDataUrl = async (value, { req, folder }) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return value || null;
  if (value === '') return '';

  const match = value.match(DATA_URL_RE);
  if (!match) return value;

  const mimeType = match[1].toLowerCase();
  const extension = MIME_EXTENSIONS[mimeType];
  if (!extension) {
    const error = new Error('Unsupported upload type. Use JPG, PNG, WebP, or PDF.');
    error.code = 'UPLOAD_UNSUPPORTED_TYPE';
    throw error;
  }

  const buffer = Buffer.from(match[2], 'base64');
  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES);
  if (buffer.length > maxBytes) {
    const error = new Error('Uploaded file is too large. Please choose a smaller file.');
    error.code = 'UPLOAD_TOO_LARGE';
    throw error;
  }

  const safeFolder = String(folder || 'general').replace(/[^a-z0-9/_-]/gi, '');
  const targetDir = path.join(UPLOAD_ROOT, safeFolder);
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, filename), buffer);

  return `${getPublicBaseUrl(req)}/uploads/${safeFolder}/${filename}`;
};

const sendUploadError = (res, err) => {
  if (err.code === 'UPLOAD_TOO_LARGE') {
    res.status(413).json({ error: err.message });
    return true;
  }

  if (err.code === 'UPLOAD_UNSUPPORTED_TYPE') {
    res.status(400).json({ error: err.message });
    return true;
  }

  return false;
};

module.exports = {
  saveDataUrl,
  sendUploadError,
  UPLOAD_ROOT
};
