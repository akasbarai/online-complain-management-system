const assert = require('assert');
const {
  consumePasswordResetToken,
  createPasswordResetToken,
  verifyPasswordResetToken
} = require('../utils/passwordResetTokens');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-reset-token-secret';

const createFakeDb = () => {
  const rows = [];

  return {
    rows,
    async query(sql, params) {
      if (sql.includes('INSERT INTO password_reset_tokens')) {
        rows.push({
          id: params[0],
          token_hash: params[1],
          account_type: params[2],
          account_id: params[3],
          email: params[4],
          created_by: params[5],
          expires_at: params[6],
          used_at: null
        });
        return [{ affectedRows: 1 }];
      }

      if (sql.includes('UPDATE password_reset_tokens') && sql.includes('id != ?')) {
        const [accountType, accountId, exceptTokenId] = params;
        let affectedRows = 0;
        for (const row of rows) {
          if (
            row.account_type === accountType &&
            row.account_id === accountId &&
            row.id !== exceptTokenId &&
            row.used_at === null
          ) {
            row.used_at = new Date();
            affectedRows += 1;
          }
        }
        return [{ affectedRows }];
      }

      if (
        sql.includes('UPDATE password_reset_tokens') &&
        sql.includes('WHERE account_type = ?') &&
        !sql.includes('id != ?') &&
        !sql.includes('AND token_hash = ?')
      ) {
        const [accountType, accountId] = params;
        let affectedRows = 0;
        for (const row of rows) {
          if (row.account_type === accountType && row.account_id === accountId && row.used_at === null) {
            row.used_at = new Date();
            affectedRows += 1;
          }
        }
        return [{ affectedRows }];
      }

      if (sql.includes('SELECT id') && sql.includes('FROM password_reset_tokens')) {
        const [id, tokenHash, accountType, accountId] = params;
        return [rows.filter((row) =>
          row.id === id &&
          row.token_hash === tokenHash &&
          row.account_type === accountType &&
          row.account_id === accountId &&
          row.used_at === null &&
          row.expires_at > new Date()
        )];
      }

      if (sql.includes('UPDATE password_reset_tokens') && sql.includes('AND token_hash = ?')) {
        const [id, tokenHash, accountType, accountId] = params;
        const row = rows.find((candidate) =>
          candidate.id === id &&
          candidate.token_hash === tokenHash &&
          candidate.account_type === accountType &&
          candidate.account_id === accountId &&
          candidate.used_at === null &&
          candidate.expires_at > new Date()
        );

        if (!row) return [{ affectedRows: 0 }];
        row.used_at = new Date();
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Unexpected query in fake DB: ${sql}`);
    }
  };
};

(async () => {
  const account = { id: 'u-1', email: 'citizen@example.com' };
  const db = createFakeDb();

  const token = await createPasswordResetToken(db, {
    accountType: 'user',
    account,
    createdBy: 'self'
  });

  const decoded = await verifyPasswordResetToken(db, token, 'user');
  assert.strictEqual(decoded.id, account.id);
  assert.strictEqual(decoded.accountType, 'user');

  await consumePasswordResetToken(db, token, 'user');
  await assert.rejects(() => verifyPasswordResetToken(db, token, 'user'));
  await assert.rejects(() => consumePasswordResetToken(db, token, 'user'));

  const oldToken = await createPasswordResetToken(db, {
    accountType: 'user',
    account,
    createdBy: 'self'
  });
  const newToken = await createPasswordResetToken(db, {
    accountType: 'user',
    account,
    createdBy: 'self'
  });

  await assert.rejects(() => verifyPasswordResetToken(db, oldToken, 'user'));
  await verifyPasswordResetToken(db, newToken, 'user');

  console.log('Password reset token tests passed.');
})();
