import { one, pool, run } from './index.js';
import { hashPassword, passwordIssues } from '../lib/passwords.js';
import { config } from '../config.js';

async function resetAdminPassword(): Promise<void> {
  const email = (process.env.ADMIN_RESET_EMAIL ?? config.admin.email).trim().toLowerCase();
  const password = process.env.ADMIN_RESET_PASSWORD ?? config.admin.password;
  const allowPromotion = process.env.ADMIN_RESET_PROMOTE === 'true';

  if (!email) throw new Error('Set ADMIN_EMAIL or ADMIN_RESET_EMAIL to the existing admin account email.');
  const issues = passwordIssues(password);
  if (issues.length > 0) throw new Error(`Password must contain ${issues.join(', ')}.`);

  const account = await one<{ id: string; role: string }>(
    'SELECT id, role FROM users WHERE lower(email) = ?',
    email,
  );
  if (!account) {
    throw new Error('No account exists for ADMIN_RESET_EMAIL in this database. Check the database URL and email. Password was not changed.');
  }
  if (account.role !== 'ADMIN' && !allowPromotion) {
    throw new Error(`An account exists with role ${account.role}. Set ADMIN_RESET_PROMOTE=true only if you intend to make it an admin. Password was not changed.`);
  }

  await run(
    `UPDATE users SET email = ?, password_hash = ?, role = 'ADMIN', status = 'ACTIVE' WHERE id = ?`,
    config.admin.email,
    hashPassword(password),
    account.id,
  );
  console.log(account.role === 'ADMIN' ? 'Admin credentials updated.' : 'Account promoted to admin and credentials updated.');
}

const invokedDirectly = process.argv[1]?.includes('reset-admin-password');
if (invokedDirectly) {
  resetAdminPassword()
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'Admin password reset failed.');
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}