import { config } from '../config.js';
import { one, query, run, toIso } from '../db/index.js';
import { randomToken, sha256 } from '../lib/ids.js';
import { sendMail } from '../lib/mailer.js';

/** A learner can ask for another link once a minute. */
export const RESEND_WAIT_SECONDS = 60;
const LINK_LIFETIME_HOURS = 24;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Emails a one-time link that confirms the address belongs to the learner. */
export async function sendVerificationEmail(user: { id: string; full_name: string; email: string }): Promise<void> {
  const token = randomToken(32);
  await run(
    'INSERT INTO email_verifications (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    sha256(token),
    user.id,
    toIso(new Date(Date.now() + LINK_LIFETIME_HOURS * 60 * 60 * 1000)),
  );

  const link = `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const firstName = user.full_name.trim().split(/\s+/)[0] || 'there';

  await sendMail({
    to: user.email,
    subject: 'Confirm your StudyReel email',
    text: [
      `Hi ${firstName},`,
      '',
      'Your StudyReel account is ready. Confirm this is your email to start studying:',
      link,
      '',
      `The link works once and expires in ${LINK_LIFETIME_HOURS} hours.`,
      'If you did not create a StudyReel account, you can ignore this email.',
    ].join('\n'),
    html: `<!doctype html>
<html><body style="margin:0;background:#0b1020;padding:32px 16px;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#e2e8f0">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#121a2e;border:1px solid #24304d;border-radius:16px">
    <tr><td style="padding:32px">
      <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8ea2ff">StudyReel</p>
      <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff">Confirm your email</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6">Hi ${escapeHtml(firstName)}, your account is ready. Confirm this is your email to start studying.</p>
      <a href="${escapeHtml(link)}" style="display:inline-block;background:#5b6cff;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">Confirm email</a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#94a3b8">The link works once and expires in ${LINK_LIFETIME_HOURS} hours. If you did not create a StudyReel account, you can ignore this email.</p>
    </td></tr>
  </table>
</body></html>`,
  });
}

/** Uses up a link. Unknown, used and expired links all read as "expired". */
export async function confirmEmail(token: string): Promise<'confirmed' | 'expired'> {
  const used = await one<{ user_id: string }>(
    'DELETE FROM email_verifications WHERE token_hash = ? AND expires_at > now() RETURNING user_id',
    sha256(token),
  );
  if (!used) return 'expired';

  await run('UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = ?', used.user_id);
  await run('DELETE FROM email_verifications WHERE user_id = ? OR expires_at <= now()', used.user_id);
  return 'confirmed';
}

export async function secondsUntilResend(userId: string): Promise<number> {
  const [latest] = await query<{ wait: number }>(
    `SELECT GREATEST(0, CEIL(? - EXTRACT(EPOCH FROM (now() - created_at))))::int AS wait
       FROM email_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    RESEND_WAIT_SECONDS,
    userId,
  );
  return latest?.wait ?? 0;
}
