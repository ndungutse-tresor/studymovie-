import { one, parseSqlDate, query } from '../db/index.js';
import { HttpError } from '../lib/http-error.js';
import type { ProgressState } from './progression.js';

interface CourseRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration_hours: number;
  accent: string;
  outcomes: string;
  prerequisites: string;
  position: number;
}

export const LEVEL_ORDER = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

function shapeCourse<T extends Record<string, unknown>>(row: CourseRow, extra: T) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    category: row.category,
    level: row.level,
    durationHours: row.duration_hours,
    accent: row.accent,
    outcomes: JSON.parse(row.outcomes) as string[],
    prerequisites: JSON.parse(row.prerequisites) as string[],
    ...extra,
  };
}

export async function listCourses(userId?: string) {
  const rows = await query<CourseRow>('SELECT * FROM courses WHERE published = 1 ORDER BY position');

  const chapterCounts = new Map(
    (
      await query<{ course_id: string; n: number }>(
        'SELECT course_id, COUNT(*) AS n FROM chapters GROUP BY course_id',
      )
    ).map((row) => [row.course_id, row.n]),
  );

  const enrolled = new Map<
    string,
    { enrollmentId: string; completed: number; total: number; status: string }
  >();

  if (userId) {
    const progressRows = await query<{
      enrollment_id: string;
      course_id: string;
      status: string;
      completed: number;
      total: number;
    }>(
      `SELECT e.id AS enrollment_id, e.course_id, e.status,
              SUM(CASE WHEN p.state = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
              COUNT(p.id) AS total
         FROM enrollments e
         LEFT JOIN chapter_progress p ON p.enrollment_id = e.id
        WHERE e.user_id = ?
        GROUP BY e.id, e.course_id, e.status`,
      userId,
    );

    for (const row of progressRows) {
      enrolled.set(row.course_id, {
        enrollmentId: row.enrollment_id,
        completed: Number(row.completed ?? 0),
        total: Number(row.total ?? 0),
        status: row.status,
      });
    }
  }

  return rows.map((row) => {
    const progress = enrolled.get(row.id);
    const chapterCount = chapterCounts.get(row.id) ?? 0;
    return shapeCourse(row, {
      chapterCount,
      enrolled: Boolean(progress),
      enrollmentStatus: progress?.status ?? null,
      completedChapters: progress?.completed ?? 0,
      percentComplete:
        progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0,
    });
  });
}

export async function getCourse(slug: string, userId?: string) {
  const row = await one<CourseRow>('SELECT * FROM courses WHERE slug = ? AND published = 1', slug);
  if (!row) throw HttpError.notFound('That course does not exist.');

  const chapters = await query<{
    id: string;
    position: number;
    title: string;
    summary: string;
    estimated_minutes: number;
    pass_mark: number;
    reward_minutes: number;
  }>(
    `SELECT id, position, title, summary, estimated_minutes, pass_mark, reward_minutes
       FROM chapters WHERE course_id = ? ORDER BY position`,
    row.id,
  );

  const questionCounts = new Map(
    (
      await query<{ chapter_id: string; n: number }>(
        `SELECT chapter_id, COUNT(*) AS n FROM questions
          WHERE chapter_id IN (SELECT id FROM chapters WHERE course_id = ?)
          GROUP BY chapter_id`,
        row.id,
      )
    ).map((entry) => [entry.chapter_id, entry.n]),
  );

  let enrollment:
    | { id: string; status: string; createdAt: string | null; completedAt: string | null }
    | null = null;
  const progressByChapter = new Map<
    string,
    { state: ProgressState; attempts: number; bestScore: number; completedAt: string | null }
  >();

  if (userId) {
    const enrollmentRow = await one<{
      id: string;
      status: string;
      created_at: Date;
      completed_at: Date | null;
    }>('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', userId, row.id);

    if (enrollmentRow) {
      enrollment = {
        id: enrollmentRow.id,
        status: enrollmentRow.status,
        createdAt: parseSqlDate(enrollmentRow.created_at)?.toISOString() ?? null,
        completedAt: parseSqlDate(enrollmentRow.completed_at)?.toISOString() ?? null,
      };

      const progressRows = await query<{
        chapter_id: string;
        state: ProgressState;
        attempts: number;
        best_score: number;
        completed_at: Date | null;
      }>('SELECT * FROM chapter_progress WHERE enrollment_id = ?', enrollmentRow.id);

      for (const entry of progressRows) {
        progressByChapter.set(entry.chapter_id, {
          state: entry.state,
          attempts: entry.attempts,
          bestScore: entry.best_score,
          completedAt: parseSqlDate(entry.completed_at)?.toISOString() ?? null,
        });
      }
    }
  }

  return shapeCourse(row, {
    enrollment,
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      position: chapter.position,
      title: chapter.title,
      summary: chapter.summary,
      estimatedMinutes: chapter.estimated_minutes,
      passMark: chapter.pass_mark,
      rewardMinutes: chapter.reward_minutes,
      questionCount: questionCounts.get(chapter.id) ?? 0,
      progress: progressByChapter.get(chapter.id) ?? null,
      state: progressByChapter.get(chapter.id)?.state ?? (enrollment ? 'LOCKED' : null),
    })),
  });
}

/** Chapter reading view. Content is only released once the chapter is unlocked. */
export async function getChapter(userId: string, chapterId: string) {
  const chapter = await one<{
    id: string;
    course_id: string;
    position: number;
    title: string;
    summary: string;
    content: string;
    estimated_minutes: number;
    pass_mark: number;
    reward_minutes: number;
  }>('SELECT * FROM chapters WHERE id = ?', chapterId);
  if (!chapter) throw HttpError.notFound('That chapter does not exist.');

  const course = (await one<{ id: string; slug: string; title: string; level: string }>(
    'SELECT id, slug, title, level FROM courses WHERE id = ?',
    chapter.course_id,
  ))!;

  const enrollment = await one<{ id: string }>(
    'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
    userId,
    chapter.course_id,
  );
  if (!enrollment) throw HttpError.forbidden('Enroll in this course to read its chapters.');

  const progress = (await one<{ state: ProgressState; attempts: number; best_score: number }>(
    'SELECT * FROM chapter_progress WHERE enrollment_id = ? AND chapter_id = ?',
    enrollment.id,
    chapter.id,
  ))!;

  if (progress.state === 'LOCKED') {
    throw HttpError.forbidden('Pass the previous chapter exam to unlock this chapter.');
  }

  const questionCount = (await one<{ n: number }>(
    'SELECT COUNT(*) AS n FROM questions WHERE chapter_id = ?',
    chapter.id,
  ))!.n;

  const next = await one<{ id: string; title: string }>(
    'SELECT id, title FROM chapters WHERE course_id = ? AND position = ?',
    chapter.course_id,
    chapter.position + 1,
  );

  return {
    id: chapter.id,
    position: chapter.position,
    title: chapter.title,
    summary: chapter.summary,
    content: chapter.content,
    estimatedMinutes: chapter.estimated_minutes,
    passMark: chapter.pass_mark,
    rewardMinutes: chapter.reward_minutes,
    questionCount,
    state: progress.state,
    attempts: progress.attempts,
    bestScore: progress.best_score,
    course: { id: course.id, slug: course.slug, title: course.title, level: course.level },
    nextChapter: next ? { id: next.id, title: next.title } : null,
  };
}

export async function courseIdFromSlug(slug: string): Promise<string> {
  const row = await one<{ id: string }>('SELECT id FROM courses WHERE slug = ? AND published = 1', slug);
  if (!row) throw HttpError.notFound('That course does not exist.');
  return row.id;
}
