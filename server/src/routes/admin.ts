import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { nowIso, one, query, run } from '../db/index.js';
import { isGmail } from '../lib/email-access.js';
import { HttpError } from '../lib/http-error.js';
import { id } from '../lib/ids.js';
import { TRACKS, TRACK_LABELS, addApprovedApplication, publicApplication } from '../services/admissions.js';

/** Figures for the admin overview: admissions, learners, study, rewards and films. */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [applications, weekly, tracks, learners, learning, exams, rewards, films, sources, recent, activity] = await Promise.all([
      query<{ status: string; count: number }>('SELECT status, count(*)::int AS count FROM applications GROUP BY status'),
      // Twelve whole weeks of applications, Monday to Sunday, oldest first.
      query<{ week: string; count: number }>(
        `SELECT to_char(weeks.week, 'YYYY-MM-DD') AS week, count(applications.id)::int AS count
         FROM generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') AS weeks(week)
         LEFT JOIN applications ON date_trunc('week', applications.created_at) = weeks.week
         GROUP BY weeks.week
         ORDER BY weeks.week`,
      ),
      query<{ track: string; count: number }>('SELECT track, count(*)::int AS count FROM applications GROUP BY track ORDER BY count DESC'),
      one<{ total: number; active: number; this_month: number; last_month: number; needs_approval: number }>(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
                count(*) FILTER (WHERE email_approved_at IS NULL AND email !~* '@(gmail|googlemail)[.]com$')::int AS needs_approval,
                count(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS this_month,
                count(*) FILTER (WHERE created_at >= date_trunc('month', now()) - interval '1 month'
                                   AND created_at < date_trunc('month', now()))::int AS last_month
         FROM users WHERE role = 'LEARNER'`,
      ),
      one<{ courses: number; chapters: number; enrollments: number; completed: number }>(
        `SELECT (SELECT count(*) FROM courses WHERE published = 1)::int AS courses,
                (SELECT count(*) FROM chapters)::int AS chapters,
                (SELECT count(*) FROM enrollments)::int AS enrollments,
                (SELECT count(*) FROM chapter_progress WHERE state = 'COMPLETED')::int AS completed`,
      ),
      one<{ taken: number; passed: number }>(
        `SELECT count(*)::int AS taken, count(*) FILTER (WHERE passed = 1)::int AS passed
         FROM exam_attempts WHERE submitted_at >= now() - interval '30 days'`,
      ),
      one<{ granted: number; watched: number; active: number; sessions: number }>(
        `SELECT coalesce(sum(minutes_granted), 0)::int AS granted,
                coalesce(sum(seconds_watched), 0)::int / 60 AS watched,
                count(*) FILTER (WHERE status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > now()))::int AS active,
                count(*)::int AS sessions
         FROM reward_sessions WHERE granted_at >= now() - interval '30 days'`,
      ),
      query<{ source: string; count: number }>('SELECT source, count(*)::int AS count FROM movie_library GROUP BY source ORDER BY count DESC'),
      query<{ name: string; status: string; item_count: number; synced_at: Date }>('SELECT name, status, item_count, synced_at FROM movie_sources ORDER BY name'),
      query<{ id: string; full_name: string; email: string; track: string; status: string; weekly_hours: number; created_at: Date }>(
        'SELECT id, full_name, email, track, status, weekly_hours, created_at FROM applications ORDER BY created_at DESC LIMIT 6',
      ),
      query<{ id: string; action: string; full_name: string | null; created_at: Date }>(
        `SELECT audit_log.id, audit_log.action, users.full_name, audit_log.created_at
         FROM audit_log LEFT JOIN users ON users.id = audit_log.user_id
         ORDER BY audit_log.created_at DESC LIMIT 6`,
      ),
    ]);

    const byStatus = { PENDING: 0, APPROVED: 0, REJECTED: 0, ENROLLED: 0 } as Record<string, number>;
    for (const row of applications) byStatus[row.status] = row.count;

    res.json({
      applications: {
        byStatus,
        weekly,
        tracks: tracks.map((row) => ({ track: row.track, label: TRACK_LABELS[row.track as keyof typeof TRACK_LABELS] ?? row.track, count: row.count })),
        recent: recent.map((row) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          trackLabel: TRACK_LABELS[row.track as keyof typeof TRACK_LABELS] ?? row.track,
          status: row.status,
          weeklyHours: row.weekly_hours,
          submittedAt: new Date(row.created_at).toISOString(),
        })),
      },
      learners: {
        total: learners?.total ?? 0,
        active: learners?.active ?? 0,
        thisMonth: learners?.this_month ?? 0,
        lastMonth: learners?.last_month ?? 0,
        needsApproval: learners?.needs_approval ?? 0,
      },
      learning: { ...learning, examsTaken: exams?.taken ?? 0, examsPassed: exams?.passed ?? 0 },
      rewards: {
        minutesGranted: rewards?.granted ?? 0,
        minutesWatched: rewards?.watched ?? 0,
        activeSessions: rewards?.active ?? 0,
        sessions: rewards?.sessions ?? 0,
      },
      films: {
        total: films.reduce((sum, row) => sum + row.count, 0),
        bySource: films,
        sources: sources.map((row) => ({ ...row, synced_at: new Date(row.synced_at).toISOString() })),
      },
      activity: activity.map((row) => ({ id: row.id, action: row.action, by: row.full_name, at: new Date(row.created_at).toISOString() })),
    });
  }),
);

interface LearnerRow {
  id: string;
  full_name: string;
  email: string;
  role: 'LEARNER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: Date;
  email_verified_at: Date | null;
  email_approved_at: Date | null;
}

function iso(value: Date | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

function learner(row: LearnerRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: iso(row.created_at),
    gmail: isGmail(row.email),
    emailVerifiedAt: iso(row.email_verified_at),
    emailApprovedAt: iso(row.email_approved_at),
  };
}

function audit(adminId: string, action: string, detail: Record<string, unknown>) {
  return run('INSERT INTO audit_log (id, user_id, action, detail) VALUES (?, ?, ?, ?)', id('aud'), adminId, action, JSON.stringify(detail));
}

/** Accounts and who may sign in. */
adminRouter.get(
  '/learners',
  asyncHandler(async (req, res) => {
    const { q } = z.object({ q: z.string().trim().max(120).optional() }).parse(req.query);
    const search = q ? `%${q.toLowerCase()}%` : null;

    const [rows, summary] = await Promise.all([
      query<LearnerRow>(
        `SELECT id, full_name, email, role, status, created_at, email_verified_at, email_approved_at
           FROM users
          WHERE (?::text IS NULL OR lower(full_name) LIKE ? OR lower(email) LIKE ?)
          ORDER BY (role = 'ADMIN') DESC, created_at DESC
          LIMIT 300`,
        search,
        search,
        search,
      ),
      one<{ total: number; needs_approval: number; unconfirmed: number }>(
        `SELECT count(*) FILTER (WHERE role = 'LEARNER')::int AS total,
                count(*) FILTER (WHERE role = 'LEARNER' AND email_approved_at IS NULL
                                   AND email !~* '@(gmail|googlemail)[.]com$')::int AS needs_approval,
                count(*) FILTER (WHERE role = 'LEARNER' AND email_approved_at IS NULL AND email_verified_at IS NULL
                                   AND email ~* '@(gmail|googlemail)[.]com$')::int AS unconfirmed
           FROM users`,
      ),
    ]);

    res.json({
      learners: rows.map(learner),
      summary: {
        total: summary?.total ?? 0,
        needsApproval: summary?.needs_approval ?? 0,
        unconfirmed: summary?.unconfirmed ?? 0,
      },
    });
  }),
);

/** Approve or withdraw an address, or mark it confirmed by hand. */
adminRouter.patch(
  '/learners/:id',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        emailAccess: z.enum(['approve', 'withdraw']).optional(),
        emailVerified: z.literal(true).optional(),
      })
      .refine((value) => value.emailAccess || value.emailVerified, 'Nothing to change.')
      .parse(req.body);

    const row = await one<LearnerRow>(
      'SELECT id, full_name, email, role, status, created_at, email_verified_at, email_approved_at FROM users WHERE id = ?',
      req.params.id,
    );
    if (!row) throw HttpError.notFound('No account matches that id.');
    if (row.role === 'ADMIN') throw HttpError.badRequest('Administrators can always sign in.');

    if (input.emailAccess === 'approve') {
      await run('UPDATE users SET email_approved_at = COALESCE(email_approved_at, ?) WHERE id = ?', nowIso(), row.id);
      await audit(req.user!.id, 'email.approved', { userId: row.id, email: row.email });
    }
    if (input.emailAccess === 'withdraw') {
      await run('UPDATE users SET email_approved_at = NULL WHERE id = ?', row.id);
      await audit(req.user!.id, 'email.withdrawn', { userId: row.id, email: row.email });
    }
    if (input.emailVerified) {
      await run('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?', nowIso(), row.id);
      await run('DELETE FROM email_verifications WHERE user_id = ?', row.id);
      await audit(req.user!.id, 'email.confirmed', { userId: row.id, email: row.email });
    }

    const updated = (await one<LearnerRow>(
      'SELECT id, full_name, email, role, status, created_at, email_verified_at, email_approved_at FROM users WHERE id = ?',
      row.id,
    ))!;
    // Sessions end at once for someone who may no longer sign in.
    if (input.emailAccess === 'withdraw' && (!isGmail(updated.email) || !updated.email_verified_at)) {
      await run('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', nowIso(), row.id);
    }

    res.json({ learner: learner(updated) });
  }),
);

/**
 * Add someone directly. They receive an approved application and an access
 * code to create the account with, whatever their email address.
 */
adminRouter.post(
  '/learners',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        fullName: z.string().trim().min(2, 'Enter their full name.').max(120),
        email: z.string().trim().email('Enter a valid email address.'),
        track: z.enum(TRACKS),
        experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
        weeklyHours: z.coerce.number().int().min(1).max(40),
      })
      .parse(req.body);

    const record = await addApprovedApplication(input);
    await audit(req.user!.id, 'learner.added', { applicationId: record.id, email: record.email });
    res.status(201).json({ application: publicApplication(record) });
  }),
);
