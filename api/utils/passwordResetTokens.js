const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createId } = require('./id');

const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token || '')).digest('hex');

const assertResetTokenPayload = (decoded, expectedAccountType) => {
  if (
    decoded.purpose !== 'password-reset' ||
    decoded.accountType !== expectedAccountType ||
    !decoded.id ||
    !decoded.jti
  ) {
    throw new Error('Invalid password reset link');
  }
};

const decodeResetToken = (token, expectedAccountType) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  assertResetTokenPayload(decoded, expectedAccountType);
  return decoded;
};

const invalidatePasswordResetTokens = async (db, accountType, accountId, exceptTokenId = null) => {
  const params = [accountType, accountId];
  let exceptSql = '';

  if (exceptTokenId) {
    exceptSql = ' AND id != ?';
    params.push(exceptTokenId);
  }

  await db.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE account_type = ?
       AND account_id = ?
       AND used_at IS NULL${exceptSql}`,
    params
  );
};

const createPasswordResetToken = async (db, { accountType, account, createdBy = 'self' }) => {
  await invalidatePasswordResetTokens(db, accountType, account.id);

  const tokenId = createId('prt-');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  const token = jwt.sign(
    {
      id: account.id,
      email: account.email,
      accountType,
      purpose: 'password-reset',
      jti: tokenId
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  await db.query(
    `INSERT INTO password_reset_tokens
      (id, token_hash, account_type, account_id, email, created_by, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tokenId, hashToken(token), accountType, account.id, account.email, createdBy, expiresAt]
  );

  return token;
};

const verifyPasswordResetToken = async (db, token, expectedAccountType) => {
  const decoded = decodeResetToken(token, expectedAccountType);
  const [tokens] = await db.query(
    `SELECT id
     FROM password_reset_tokens
     WHERE id = ?
       AND token_hash = ?
       AND account_type = ?
       AND account_id = ?
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [decoded.jti, hashToken(token), expectedAccountType, decoded.id]
  );

  if (tokens.length === 0) {
    throw new Error('Invalid password reset link');
  }

  return decoded;
};

const consumePasswordResetToken = async (db, token, expectedAccountType) => {
  const decoded = decodeResetToken(token, expectedAccountType);
  const [result] = await db.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE id = ?
       AND token_hash = ?
       AND account_type = ?
       AND account_id = ?
       AND used_at IS NULL
       AND expires_at > NOW()`,
    [decoded.jti, hashToken(token), expectedAccountType, decoded.id]
  );

  if (result.affectedRows === 0) {
    throw new Error('Invalid password reset link');
  }

  return decoded;
};

module.exports = {
  consumePasswordResetToken,
  createPasswordResetToken,
  invalidatePasswordResetTokens,
  verifyPasswordResetToken
};
