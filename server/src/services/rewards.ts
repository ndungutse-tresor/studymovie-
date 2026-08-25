import { one, nowIso, parseSqlDate, query, run, toIso, transaction } from '../db/index.js';
import { HttpError } from '../lib/http-error.js';
import { chapterContext, type RewardSessionRow } from './progression.js';

export interface RewardMovieSelection {
  id: string;
  title: string;
  source: string;
  streamUrl: string | null;
  posterUrl: string | null;
}

export interface RewardView {
  id: string;
  chapterId: string;
  chapterTitle: string;
  courseTitle: string;
  status: RewardSessionRow['status'];
  minutesGranted: number;
  secondsRemaining: number;
  expiresAt: string | null;
  startedAt: string | null;
  movie: RewardMovieSelection | null;
  /** True once the entitlement is finished, in either direction. */
  concluded: boolean;
  nextChapterId: string | null;
  courseCompleted: boolean;
}

async function loadSession(userId: string, sessionId: string): Promise<RewardSessionRow> {
  const session = await one<RewardSessionRow>('SELECT * FROM reward_sessions WHERE id = ?', sessionId);
  if (!session) throw HttpError.notFound('That viewing session does not exist.');
  if (session.user_id !== userId) {
    throw HttpError.forbidden('That viewing session belongs to another learner.');
  }
  return session;
}

/**
 * Advances the chapter to COMPLETED and opens the next one. Called exactly once
 * per reward session, whichever way the session ends.
 */
async function unlockNextChapter(
  userId: string,
  chapterId: string,
): Promise<{ nextChapterId: string | null; courseCompleted: boolean }> {
  const { chapter, enrollment, progress } = await chapterContext(userId, chapterId);

  if (progress.state !== 'COMPLETED') {
    await run(
      `UPDATE chapter_progress SET state = 'COMPLETED', completed_at = ?, updated_at = ? WHERE id = ?`,
      nowIso(),
      nowIso(),
      progress.id,
    );
  }

  const next = await one<{ id: string }>(
    'SELECT id FROM chapters WHERE course_id = ? AND position = ?',
    chapter.course_id,
    chapter.position + 1,
  );

  if (next) {
    await run(
      `UPDATE chapter_progress
          SET state = 'AVAILABLE', updated_at = ?
        WHERE enrollment_id = ? AND chapter_id = ? AND state = 'LOCKED'`,
      nowIso(),
      enrollment.id,
      next.id,
    );
    return { nextChapterId: next.id, courseCompleted: false };
  }

  const outstanding = (await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM chapter_progress WHERE enrollment_id = ? AND state != 'COMPLETED'`,
    enrollment.id,
  ))!;

  if (outstanding.n === 0) {
    await run(
      `UPDATE enrollments SET status = 'COMPLETED', completed_at = ? WHERE id = ?`,
      nowIso(),
      enrollment.id,
    );
    return { nextChapterId: null, courseCompleted: true };
  }

  return { nextChapterId: null, courseCompleted: false };
}

async function conclude(
  session: RewardSessionRow,
  status: 'EXPIRED' | 'ENDED' | 'FORFEITED',
): Promise<{ nextChapterId: string | null; courseCompleted: boolean }> {
  return transaction(async () => {
    const startedAt = parseSqlDate(session.started_at);
    const watched = startedAt
      ? Math.max(session.seconds_watched, Math.floor((Date.now() - startedAt.getTime()) / 1000))
      : session.seconds_watched;

    await run(
      'UPDATE reward_sessions SET status = ?, ended_at = ?, seconds_watched = ? WHERE id = ?',
      status,
      nowIso(),
      Math.min(watched, session.minutes_granted * 60),
      session.id,
    );

    return unlockNextChapter(session.user_id, session.chapter_id);
  });
}

async function view(
  userId: string,
  session: RewardSessionRow,
  unlocked?: { nextChapterId: string | null; courseCompleted: boolean },
): Promise<RewardView> {
  const meta = (await one<{ chapter_title: string; course_title: string }>(
    `SELECT ch.title AS chapter_title, c.title AS course_title
       FROM chapters ch JOIN courses c ON c.id = ch.course_id
      WHERE ch.id = ?`,
    session.chapter_id,
  ))!;

  const expiresAt = parseSqlDate(session.expires_at);
  const secondsRemaining =
    session.status === 'ACTIVE' && expiresAt
      ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      : session.status === 'GRANTED'
        ? session.minutes_granted * 60
        : 0;

  const concluded = ['EXPIRED', 'ENDED', 'FORFEITED'].includes(session.status);
  const resolved = unlocked ?? (concluded ? await peekNext(userId, session.chapter_id) : null);

  return {
    id: session.id,
    chapterId: session.chapter_id,
    chapterTitle: meta.chapter_title,
    courseTitle: meta.course_title,
    status: session.status,
    minutesGranted: session.minutes_granted,
    secondsRemaining,
    expiresAt: expiresAt?.toISOString() ?? null,
    startedAt: parseSqlDate(session.started_at)?.toISOString() ?? null,
    movie: session.movie_id
      ? {
          id: session.movie_id,
          title: session.movie_title ?? 'Untitled',
          source: session.movie_source ?? 'unknown',
          streamUrl: session.movie_stream_url,
          posterUrl: session.movie_poster,
        }
      : null,
    concluded,
    nextChapterId: resolved?.nextChapterId ?? null,
    courseCompleted: resolved?.courseCompleted ?? false,
  };
}

async function peekNext(userId: string, chapterId: string) {
  const { chapter, enrollment } = await chapterContext(userId, chapterId);
  const next = await one<{ id: string }>(
    'SELECT id FROM chapters WHERE course_id = ? AND position = ?',
    chapter.course_id,
    chapter.position + 1,
  );
  const enrollmentRow = (await one<{ status: string }>(
    'SELECT status FROM enrollments WHERE id = ?',
    enrollment.id,
  ))!;
  return { nextChapterId: next?.id ?? null, courseCompleted: enrollmentRow.status === 'COMPLETED' };
}

/**
 * Reads a session, expiring it first if the granted window has elapsed. Every
 * read goes through here, so an expired entitlement can never be resumed by a
 * client that simply stops polling.
 */
export async function getRewardSession(userId: string, sessionId: string): Promise<RewardView> {
  let session = await loadSession(userId, sessionId);

  if (session.status === 'ACTIVE') {
    const expiresAt = parseSqlDate(session.expires_at);
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      const unlocked = await conclude(session, 'EXPIRED');
      session = await loadSession(userId, sessionId);
      return view(userId, session, unlocked);
    }
  }

  return view(userId, session);
}

/** Starts the clock. The expiry is fixed here and never extended. */
export async function startRewardSession(
  userId: string,
  sessionId: string,
  movie: RewardMovieSelection,
): Promise<RewardView> {
  const session = await loadSession(userId, sessionId);

  if (session.status === 'ACTIVE') return getRewardSession(userId, sessionId);
  if (session.status !== 'GRANTED') {
    throw HttpError.conflict('This viewing entitlement has already been used.');
  }

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + session.minutes_granted * 60_000);

  await transaction(async () => {
    await run(
      `UPDATE reward_sessions
          SET status = 'ACTIVE', started_at = ?, expires_at = ?,
              movie_id = ?, movie_title = ?, movie_source = ?, movie_stream_url = ?, movie_poster = ?
        WHERE id = ?`,
      toIso(startedAt),
      toIso(expiresAt),
      movie.id,
      movie.title,
      movie.source,
      movie.streamUrl,
      movie.posterUrl,
      sessionId,
    );

    const context = await chapterContext(userId, session.chapter_id);
    await run(
      `UPDATE chapter_progress SET state = 'REWARD_ACTIVE', updated_at = ? WHERE id = ?`,
      nowIso(),
      context.progress.id,
    );
  });

  return getRewardSession(userId, sessionId);
}

/** Ends a session early; the remaining time is not banked. */
export async function endRewardSession(userId: string, sessionId: string): Promise<RewardView> {
  const session = await loadSession(userId, sessionId);
  if (['EXPIRED', 'ENDED', 'FORFEITED'].includes(session.status)) {
    return getRewardSession(userId, sessionId);
  }

  const status = session.status === 'GRANTED' ? 'FORFEITED' : 'ENDED';
  const unlocked = await conclude(session, status);
  return view(userId, await loadSession(userId, sessionId), unlocked);
}

export async function listRewardSessions(userId: string) {
  const rows = await query<RewardSessionRow & { chapter_title: string; course_title: string }>(
    `SELECT r.*, ch.title AS chapter_title, c.title AS course_title
       FROM reward_sessions r
       JOIN chapters ch ON ch.id = r.chapter_id
       JOIN courses c ON c.id = ch.course_id
      WHERE r.user_id = ?
      ORDER BY r.granted_at DESC
      LIMIT 50`,
    userId,
  );

  return rows.map((row) => ({
    id: row.id,
    chapterId: row.chapter_id,
    chapterTitle: row.chapter_title,
    courseTitle: row.course_title,
    status: row.status,
    minutesGranted: row.minutes_granted,
    minutesWatched: Math.round(row.seconds_watched / 60),
    movieTitle: row.movie_title,
    posterUrl: row.movie_poster,
    grantedAt: parseSqlDate(row.granted_at)?.toISOString() ?? null,
    endedAt: parseSqlDate(row.ended_at)?.toISOString() ?? null,
  }));
}

/** The entitlement a learner can act on right now, if any. */
export async function activeReward(userId: string): Promise<RewardView | null> {
  const row = await one<{ id: string }>(
    `SELECT id FROM reward_sessions
      WHERE user_id = ? AND status IN ('GRANTED','ACTIVE')
      ORDER BY granted_at DESC LIMIT 1`,
    userId,
  );
  if (!row) return null;

  const session = await getRewardSession(userId, row.id);
  return session.concluded ? null : session;
}
