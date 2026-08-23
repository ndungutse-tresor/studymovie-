import { config } from '../config.js';
import { db, nowIso, parseSqlDate, toIso, transaction } from '../db/index.js';
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

function issueTokens(user: UserRow): SessionTokens {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = randomToken();

  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
  ).run(
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
export function register(input: {
  accessCode: string;
  password: string;
  timezone?: string;
}): AuthResult {
  const issues = passwordIssues(input.password);
  if (issues.length > 0) {
    throw HttpError.badRequest(`Your password needs ${issues.join(', ')}.`);
  }

  const application = findApplicationByAccessCode(input.accessCode);
  if (!application) throw HttpError.badRequest('That access code is not recognised.');
  if (application.status === 'ENROLLED') {
    throw HttpError.conflict('This access code has already been used. Sign in instead.');
  }
  if (application.status !== 'APPROVED') {
    throw HttpError.forbidden('This application has not been approved yet.');
  }

  const timezone = input.timezone && isValidTimeZone(input.timezone) ? input.timezone : 'UTC';

  return transaction(() => {
    const userId = id('usr');
    db.prepare(
      `INSERT INTO users (id, application_id, full_name, email, password_hash, role, timezone)
       VALUES (?, ?, ?, ?, ?, 'LEARNER', ?)`,
    ).run(
      userId,
      application.id,
      application.full_name,
      application.email,
      hashPassword(input.password),
      timezone,
    );

    db.prepare(`UPDATE applications SET status = 'ENROLLED' WHERE id = ?`).run(application.id);

    // Admission carries an automatic enrolment into the track's entry course,
    // so a new learner lands on a dashboard with work already available.
    const slug = starterCourseSlug(application.track as Track, application.experience_level as Level);
    const course = db.prepare('SELECT id FROM courses WHERE slug = ?').get(slug) as
      | { id: string }
      | undefined;

    if (course) {
      enroll(userId, course.id);
      seedDefaultSchedule(userId, course.id, application.weekly_hours);
    } else {
      seedDefaultSchedule(userId, null, application.weekly_hours);
    }

    db.prepare('INSERT INTO audit_log (id, user_id, action, detail) VALUES (?, ?, ?, ?)').run(
      id('aud'),
      userId,
      'account.created',
      JSON.stringify({ applicationId: application.id, track: application.track }),
    );

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;
    return { ...issueTokens(user), user: publicUser(user) };
  });
}

export function login(email: string, password: string): AuthResult {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as
    | UserRow
    | undefined;

  // Constant-ish work on both branches so a missing account is not detectable
  // by response time alone.
  const hash = user?.password_hash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const valid = verifyPassword(password, hash);

  if (!user || !valid) throw HttpError.unauthorized('Email or password is incorrect.');
  if (user.status !== 'ACTIVE') throw HttpError.forbidden('This account is suspended.');

  return { ...issueTokens(user), user: publicUser(user) };
}

export function refresh(refreshToken: string): AuthResult {
  const tokenHash = sha256(refreshToken);
  const row = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(tokenHash) as
    | { id: string; user_id: string; expires_at: string; revoked_at: string | null }
    | undefined;

  if (!row || row.revoked_at) throw HttpError.unauthorized('Your session has ended. Sign in again.');

  const expiresAt = parseSqlDate(row.expires_at);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    throw HttpError.unauthorized('Your session has expired. Sign in again.');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) as UserRow | undefined;
  if (!user || user.status !== 'ACTIVE') throw HttpError.unauthorized('Account is unavailable.');

  return transaction(() => {
    // Rotate: the presented token is retired as the replacement is issued.
    db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?').run(nowIso(), row.id);
    return { ...issueTokens(user), user: publicUser(user) };
  });
}

export function logout(refreshToken: string | undefined): { ok: true } {
  if (refreshToken) {
    db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL').run(
      nowIso(),
      sha256(refreshToken),
    );
  }
  return { ok: true };
}

export function updateProfile(userId: string, input: { fullName?: string; timezone?: string }) {
  if (input.timezone && !isValidTimeZone(input.timezone)) {
    throw HttpError.badRequest('That is not a recognised time zone.');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;
  db.prepare('UPDATE users SET full_name = ?, timezone = ? WHERE id = ?').run(
    input.fullName?.trim() || user.full_name,
    input.timezone ?? user.timezone,
    userId,
  );

  return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow);
}

export function changePassword(userId: string, currentPassword: string, nextPassword: string) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;
  if (!verifyPassword(currentPassword, user.password_hash)) {
    throw HttpError.badRequest('Your current password is incorrect.');
  }

  const issues = passwordIssues(nextPassword);
  if (issues.length > 0) throw HttpError.badRequest(`Your new password needs ${issues.join(', ')}.`);

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(nextPassword), userId);
  // Every existing session is invalidated on a password change.
  db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(
    nowIso(),
    userId,
  );

  return { ok: true as const };
}

export function currentUser(userId: string) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
  if (!user) throw HttpError.notFound('Account not found.');
  return publicUser(user);
}
