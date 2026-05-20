const nodemailer = require('nodemailer');

let transporter;
let transporterKey;

const PLACEHOLDER_RE = /^(your_|replace_|change_this|example\b|todo\b)/i;

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
  const user = readFirstUsableEnv('GMAIL_USER', 'SMTP_USER');
  const pass = readFirstUsableEnv('GMAIL_APP_PASSWORD', 'GMAIL_PASS', 'SMTP_PASS');
  const host = readFirstUsableEnv('SMTP_HOST');
  const explicitService = readEnv('SMTP_SERVICE');
  const service = isUsableValue(explicitService) ? explicitService : (isUsableValue(gmailUser) ? 'gmail' : '');

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
    from: readEnv('MAIL_FROM') || readEnv('GMAIL_FROM') || user
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
    message: 'Set GMAIL_USER and GMAIL_APP_PASSWORD, or set SMTP_HOST/SMTP_USER/SMTP_PASS, on the API server.'
  };
};

const getTransporter = () => {
  const config = getMailConfig();
  if (!config) {
    const error = new Error(getMailStatus().message);
    error.code = 'MAIL_NOT_CONFIGURED';
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

module.exports = {
  getMailStatus,
  sendAccountVerifiedEmail,
  verifyMailTransport
};
