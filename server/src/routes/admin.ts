import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { one, query } from '../db/index.js';
import { TRACK_LABELS } from '../services/admissions.js';

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
      one<{ total: number; active: number; this_month: number; last_month: number }>(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
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
