const nodemailer = require('nodemailer');

let transporter;
let transporterKey;

const PLACEHOLDER_RE = /^(your_|replace_|change_this|example\b|todo\b)/i;
const ADMIN_MAIL_ADDRESS = 'akas69167@gmail.com';
const ADMIN_MAIL_FROM = `OCMS Admin <${ADMIN_MAIL_ADDRESS}>`;

const readEnv = (name) => {
  const value = process.env[name];
  if (!value) return '';
  return String(value).trim().replace(/^["']|["']$/g, '');
};

const isUsableValue = (value) => value && !PLACEHOLDER_RE.test(value);

const readFirstUsableEnv = (...names) =>
  names.map(readEnv).find(isUsableValue) || '';

const getMailConfig = () => {
  const gmailUser = readEnv('GMAIL_USER');
  const pass = readFirstUsableEnv('GMAIL_APP_PASSWORD', 'GMAIL_PASS', 'SMTP_PASS');
  const host = readFirstUsableEnv('SMTP_HOST');
  const user = host
    ? readFirstUsableEnv('SMTP_USER', 'GMAIL_USER')
    : readFirstUsableEnv('GMAIL_USER', 'SMTP_USER') || (pass ? ADMIN_MAIL_ADDRESS : '');
  const explicitService = readEnv('SMTP_SERVICE');
  const service = isUsableValue(explicitService) ? explicitService : (!host && (isUsableValue(gmailUser) || isUsableValue(pass)) ? 'gmail' : '');

  if (!user || !pass || (!host && !service)) {
    return null;
  }

  const parsedPort = Number(readEnv('SMTP_PORT'));
  const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 587;

  return {
    user,
    pass,
    host,
    port,
    secure: readEnv('SMTP_SECURE') === 'true' || port === 465,
    service,
    from: ADMIN_MAIL_FROM
  };
};

const getMailStatus = () => {
  const config = getMailConfig();
  if (config) {
    return {
      configured: true,
      from: config.from,
      transport: config.service || config.host || 'smtp'
    };
  }

  return {
    configured: false,
    message: `Set GMAIL_USER=${ADMIN_MAIL_ADDRESS} and GMAIL_APP_PASSWORD on the API server.`
  };
};

const getTransporter = () => {
  const config = getMailConfig();
  if (!config) {
    const error = new Error(getMailStatus().message);
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }

  if (config.user.toLowerCase() !== ADMIN_MAIL_ADDRESS) {
    const error = new Error(`Admin emails must be sent through ${ADMIN_MAIL_ADDRESS}. Set GMAIL_USER=${ADMIN_MAIL_ADDRESS}.`);
    error.code = 'MAIL_SENDER_MISMATCH';
    throw error;
  }

  const key = JSON.stringify({
    user: config.user,
    host: config.host,
    port: config.port,
    secure: config.secure,
    service: config.service
  });

  if (!transporter || transporterKey !== key) {
    const transportOptions = config.host
      ? {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass
        }
      }
      : {
        service: config.service || 'gmail',
        auth: {
          user: config.user,
          pass: config.pass
        }
      };

    transporter = nodemailer.createTransport(transportOptions);
    transporterKey = key;
  }

  return { transporter, from: config.from };
};

const verifyMailTransport = async () => {
  const mailer = getTransporter();
  await mailer.transporter.verify();
  return {
    from: mailer.from
  };
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sendMail = async ({ to, subject, text, html }) => {
  const mailer = getTransporter();
  return mailer.transporter.sendMail({
    from: mailer.from,
    to,
    subject,
    text,
    html
  });
};

const sendAccountVerifiedEmail = ({ to, name, loginUrl }) => {
  const safeName = name || 'Citizen';
  const subject = 'Your OCMS account has been verified';
  const text = [
    `Hello ${safeName},`,
    '',
    'Your OCMS account has been verified by the administration team.',
    'You can now sign in and lodge or track complaints through the citizen portal.',
    '',
    `Login here: ${loginUrl}`,
    '',
    'Regards,',
    'OCMS Admin Team'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <p>Hello ${escapeHtml(safeName)},</p>
      <p>Your OCMS account has been verified by the administration team.</p>
      <p>You can now sign in and lodge or track complaints through the citizen portal.</p>
      <p>
        <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none">
          Sign in to OCMS
        </a>
      </p>
      <p>Regards,<br/>OCMS Admin Team</p>
    </div>
  `;

  return sendMail({ to, subject, text, html });
};

const sendPasswordResetEmail = ({ to, name, resetUrl }) => {
  const safeName = name || 'Citizen';
  const subject = 'Reset your OCMS password';
  const text = [
    `Hello ${safeName},`,
    '',
    'We received a request to reset your OCMS password.',
    'Use the link below to set a new password. This link expires in 24 hours.',
    '',
    `Reset password: ${resetUrl}`,
    '',
    'If you did not request this, you can ignore this email.',
    '',
    'Regards,',
    'OCMS Admin Team'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <p>Hello ${escapeHtml(safeName)},</p>
      <p>We received a request to reset your OCMS password.</p>
      <p>Use the link below to set a new password. This link expires in 24 hours.</p>
      <p>
        <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none">
          Reset password
        </a>
      </p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>Regards,<br/>OCMS Admin Team</p>
    </div>
  `;

  return sendMail({ to, subject, text, html });
};

module.exports = {
  getMailStatus,
  sendAccountVerifiedEmail,
  sendPasswordResetEmail,
  verifyMailTransport
};
