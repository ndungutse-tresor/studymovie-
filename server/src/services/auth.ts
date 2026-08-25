import { config } from '../config.js';
import { one, nowIso, parseSqlDate, run, toIso, transaction } from '../db/index.js';
import { id, randomToken, sha256 } from '../lib/ids.js';
import { HttpError } from '../lib/http-error.js';
import { hashPassword, passwordIssues, verifyPassword } from '../lib/passwords.js';
import { signAccessToken } from '../lib/tokens.js';
import { isValidTimeZone } from '../lib/timezone.js';
import { findApplicationByAccessCode, starterCourseSlug, type Level, type Track } from './admissions.js';
import { enroll } from './progression.js';
import { seedDefaultSchedule } from './schedule.js';

interface UserRow {
  id: string;
  application_id: string | null;
  full_name: string;
  email: string;
  password_hash: string;
  role: 'LEARNER' | 'ADMIN';
  timezone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult extends SessionTokens {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: 'LEARNER' | 'ADMIN';
    timezone: string;
    createdAt: string | null;
  };
}

function publicUser(row: UserRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    timezone: row.timezone,
    createdAt: parseSqlDate(row.created_at)?.toISOString() ?? null,
  };
}

async function issueTokens(user: UserRow): Promise<SessionTokens> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = randomToken();

  await run(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    id('rft'),
    user.id,
    sha256(refreshToken),
    toIso(new Date(Date.now() + config.auth.refreshTtlSeconds * 1000)),
  );

  return { accessToken, refreshToken, expiresIn: config.auth.accessTtlSeconds };
}

/**
 * Converts an approved application into an account. The access code issued at
 * admission is the only route in — registration is not open to the public.
 */
export async function register(input: {
  accessCode: string;
  password: string;
  timezone?: string;
}): Promise<AuthResult> {
  const issues = passwordIssues(input.password);
  if (issues.length > 0) {
    throw HttpError.badRequest(`Your password needs ${issues.join(', ')}.`);
  }

  const application = await findApplicationByAccessCode(input.accessCode);
  if (!application) throw HttpError.badRequest('That access code is not recognised.');
  if (application.status === 'ENROLLED') {
    throw HttpError.conflict('This access code has already been used. Sign in instead.');
  }
  if (application.status !== 'APPROVED') {
    throw HttpError.forbidden('This application has not been approved yet.');
  }

  const timezone = input.timezone && isValidTimeZone(input.timezone) ? input.timezone : 'UTC';

  return transaction(async () => {
    const userId = id('usr');
    await run(
      `INSERT INTO users (id, application_id, full_name, email, password_hash, role, timezone)
       VALUES (?, ?, ?, ?, ?, 'LEARNER', ?)`,
      userId,
      application.id,
      application.full_name,
      application.email,
      hashPassword(input.password),
      timezone,
    );

    await run(`UPDATE applications SET status = 'ENROLLED' WHERE id = ?`, application.id);

    // Admission carries an automatic enrolment into the track's entry course,
    // so a new learner lands on a dashboard with work already available.
    const slug = starterCourseSlug(application.track as Track, application.experience_level as Level);
    const course = await one<{ id: string }>('SELECT id FROM courses WHERE slug = ?', slug);

    if (course) {
      await enroll(userId, course.id);
      await seedDefaultSchedule(userId, course.id, application.weekly_hours);
    } else {
      await seedDefaultSchedule(userId, null, application.weekly_hours);
    }

    await run(
      'INSERT INTO audit_log (id, user_id, action, detail) VALUES (?, ?, ?, ?)',
      id('aud'),
      userId,
      'account.created',
      JSON.stringify({ applicationId: application.id, track: application.track }),
    );

    const user = (await one<UserRow>('SELECT * FROM users WHERE id = ?', userId))!;
    return { ...(await issueTokens(user)), user: publicUser(user) };
  });
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await one<UserRow>('SELECT * FROM users WHERE email = ?', email.toLowerCase());

  // Constant-ish work on both branches so a missing account is not detectable
  // by response time alone.
  const hash = user?.password_hash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const valid = verifyPassword(password, hash);

  if (!user || !valid) throw HttpError.unauthorized('Email or password is incorrect.');
  if (user.status !== 'ACTIVE') throw HttpError.forbidden('This account is suspended.');

  return { ...(await issueTokens(user)), user: publicUser(user) };
}

export async function refresh(refreshToken: string): Promise<AuthResult> {
  const tokenHash = sha256(refreshToken);
  const row = await one<{ id: string; user_id: string; expires_at: string; revoked_at: string | null }>(
    'SELECT * FROM refresh_tokens WHERE token_hash = ?',
    tokenHash,
  );

  if (!row || row.revoked_at) throw HttpError.unauthorized('Your session has ended. Sign in again.');

  const expiresAt = parseSqlDate(row.expires_at);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    throw HttpError.unauthorized('Your session has expired. Sign in again.');
  }

  const user = await one<UserRow>('SELECT * FROM users WHERE id = ?', row.user_id);
  if (!user || user.status !== 'ACTIVE') throw HttpError.unauthorized('Account is unavailable.');

  return transaction(async () => {
    // Rotate: the presented token is retired as the replacement is issued.
    await run('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?', nowIso(), row.id);
    return { ...(await issueTokens(user)), user: publicUser(user) };
  });
}

export async function logout(refreshToken: string | undefined): Promise<{ ok: true }> {
  if (refreshToken) {
    await run(
      'UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL',
      nowIso(),
      sha256(refreshToken),
    );
  }
  return { ok: true };
}

export async function updateProfile(userId: string, input: { fullName?: string; timezone?: string }) {
  if (input.timezone && !isValidTimeZone(input.timezone)) {
    throw HttpError.badRequest('That is not a recognised time zone.');
  }

  const user = (await one<UserRow>('SELECT * FROM users WHERE id = ?', userId))!;
  await run(
    'UPDATE users SET full_name = ?, timezone = ? WHERE id = ?',
    input.fullName?.trim() || user.full_name,
    input.timezone ?? user.timezone,
    userId,
  );

  return publicUser((await one<UserRow>('SELECT * FROM users WHERE id = ?', userId))!);
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string) {
  const user = (await one<UserRow>('SELECT * FROM users WHERE id = ?', userId))!;
  if (!verifyPassword(currentPassword, user.password_hash)) {
    throw HttpError.badRequest('Your current password is incorrect.');
  }

  const issues = passwordIssues(nextPassword);
  if (issues.length > 0) throw HttpError.badRequest(`Your new password needs ${issues.join(', ')}.`);

  await run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(nextPassword), userId);
  // Every existing session is invalidated on a password change.
  await run(
    'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
    nowIso(),
    userId,
  );

  return { ok: true as const };
}

export async function currentUser(userId: string) {
  const user = await one<UserRow>('SELECT * FROM users WHERE id = ?', userId);
  if (!user) throw HttpError.notFound('Account not found.');
  return publicUser(user);
}
