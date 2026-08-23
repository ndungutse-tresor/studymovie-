import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { db, parseSqlDate } from '../db/index.js';
import { listCourses } from '../services/courses.js';
import { activeReward } from '../services/rewards.js';
import { upcomingOccurrences } from '../services/schedule.js';
import { listDecisions } from '../services/movies/index.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

/** Everything the learner's home screen needs, in one round trip. */
dashboardRouter.get(
  '/',
  asyncHandler((req, res) => {
    const userId = req.user!.id;

    const courses = listCourses(userId).filter((course) => course.enrolled);

    const nextChapter = db
      .prepare(
        `SELECT ch.id, ch.title, ch.position, ch.estimated_minutes, ch.reward_minutes, ch.pass_mark,
                p.state, c.title AS course_title, c.slug AS course_slug, c.level
           FROM chapter_progress p
           JOIN enrollments e ON e.id = p.enrollment_id
           JOIN chapters ch ON ch.id = p.chapter_id
           JOIN courses c ON c.id = ch.course_id
          WHERE e.user_id = ? AND p.state IN ('AVAILABLE','STUDYING','EXAM_READY','REWARD_READY','REWARD_ACTIVE')
          ORDER BY CASE p.state
                     WHEN 'REWARD_ACTIVE' THEN 0
                     WHEN 'REWARD_READY' THEN 1
                     WHEN 'EXAM_READY' THEN 2
                     WHEN 'STUDYING' THEN 3
                     ELSE 4
                   END,
                   c.position, ch.position
          LIMIT 1`,
      )
      .get(userId) as
      | {
          id: string;
          title: string;
          position: number;
          estimated_minutes: number;
          reward_minutes: number;
          pass_mark: number;
          state: string;
          course_title: string;
          course_slug: string;
          level: string;
        }
      | undefined;

    const stats = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM chapter_progress p JOIN enrollments e ON e.id = p.enrollment_id
             WHERE e.user_id = ? AND p.state = 'COMPLETED') AS chapters_completed,
           (SELECT COUNT(*) FROM exam_attempts WHERE user_id = ? AND submitted_at IS NOT NULL) AS exams_taken,
           (SELECT COUNT(*) FROM exam_attempts WHERE user_id = ? AND passed = 1) AS exams_passed,
           (SELECT COALESCE(SUM(seconds_watched), 0) FROM reward_sessions WHERE user_id = ?) AS seconds_watched,
           (SELECT COALESCE(AVG(score), 0) FROM exam_attempts WHERE user_id = ? AND submitted_at IS NOT NULL) AS average_score`,
      )
      .get(userId, userId, userId, userId, userId) as {
      chapters_completed: number;
      exams_taken: number;
      exams_passed: number;
      seconds_watched: number;
      average_score: number;
    };

    const recentAttempts = db
      .prepare(
        `SELECT a.id, a.score, a.passed, a.submitted_at, ch.title AS chapter_title, c.title AS course_title
           FROM exam_attempts a
           JOIN chapters ch ON ch.id = a.chapter_id
           JOIN courses c ON c.id = ch.course_id
          WHERE a.user_id = ? AND a.submitted_at IS NOT NULL
          ORDER BY a.submitted_at DESC LIMIT 5`,
      )
      .all(userId) as {
      id: string;
      score: number;
      passed: number;
      submitted_at: string;
      chapter_title: string;
      course_title: string;
    }[];

    res.json({
      courses,
      nextChapter: nextChapter
        ? {
            id: nextChapter.id,
            title: nextChapter.title,
            position: nextChapter.position,
            estimatedMinutes: nextChapter.estimated_minutes,
            rewardMinutes: nextChapter.reward_minutes,
            passMark: nextChapter.pass_mark,
            state: nextChapter.state,
            courseTitle: nextChapter.course_title,
            courseSlug: nextChapter.course_slug,
            level: nextChapter.level,
          }
        : null,
      activeReward: activeReward(userId),
      upcoming: upcomingOccurrences(userId, req.user!.timezone, 7).slice(0, 5),
      watchLater: listDecisions(userId, 'WATCH_LATER').slice(0, 6),
      stats: {
        chaptersCompleted: stats.chapters_completed,
        examsTaken: stats.exams_taken,
        examsPassed: stats.exams_passed,
        minutesWatched: Math.round(stats.seconds_watched / 60),
        averageScore: Math.round(stats.average_score),
      },
      recentAttempts: recentAttempts.map((attempt) => ({
        id: attempt.id,
        score: attempt.score,
        passed: attempt.passed === 1,
        submittedAt: parseSqlDate(attempt.submitted_at)?.toISOString() ?? null,
        chapterTitle: attempt.chapter_title,
        courseTitle: attempt.course_title,
      })),
    });
  }),
);
