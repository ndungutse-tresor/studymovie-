import { db, transaction } from './index.js';
import { catalog } from './content/index.js';
import { id } from '../lib/ids.js';
import { hashPassword } from '../lib/passwords.js';
import { config } from '../config.js';

/**
 * Idempotent seeding: courses are matched by slug and their chapters and
 * questions are rebuilt, so editing lesson content and re-running the seed
 * updates existing rows instead of duplicating the catalog.
 */
function seedCatalog(): void {
  const upsertCourse = db.prepare(`
    INSERT INTO courses (id, slug, title, summary, description, category, level, duration_hours, accent, outcomes, prerequisites, position, published)
    VALUES (@id, @slug, @title, @summary, @description, @category, @level, @durationHours, @accent, @outcomes, @prerequisites, @position, 1)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      description = excluded.description,
      category = excluded.category,
      level = excluded.level,
      duration_hours = excluded.duration_hours,
      accent = excluded.accent,
      outcomes = excluded.outcomes,
      prerequisites = excluded.prerequisites,
      position = excluded.position
  `);

  const findCourse = db.prepare('SELECT id FROM courses WHERE slug = ?');
  const findChapter = db.prepare('SELECT id FROM chapters WHERE course_id = ? AND position = ?');

  const upsertChapter = db.prepare(`
    INSERT INTO chapters (id, course_id, position, title, summary, content, estimated_minutes, pass_mark, reward_minutes)
    VALUES (@id, @courseId, @position, @title, @summary, @content, @estimatedMinutes, @passMark, @rewardMinutes)
    ON CONFLICT(course_id, position) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      content = excluded.content,
      estimated_minutes = excluded.estimated_minutes,
      pass_mark = excluded.pass_mark,
      reward_minutes = excluded.reward_minutes
  `);

  const upsertQuestion = db.prepare(`
    INSERT INTO questions (id, chapter_id, position, prompt, options, correct_index, explanation)
    VALUES (@id, @chapterId, @position, @prompt, @options, @correctIndex, @explanation)
    ON CONFLICT(chapter_id, position) DO UPDATE SET
      prompt = excluded.prompt,
      options = excluded.options,
      correct_index = excluded.correct_index,
      explanation = excluded.explanation
  `);

  const pruneQuestions = db.prepare('DELETE FROM questions WHERE chapter_id = ? AND position >= ?');
  const pruneChapters = db.prepare('DELETE FROM chapters WHERE course_id = ? AND position >= ?');

  catalog.forEach((course, courseIndex) => {
    upsertCourse.run({
      id: id('crs'),
      slug: course.slug,
      title: course.title,
      summary: course.summary,
      description: course.description,
      category: course.category,
      level: course.level,
      durationHours: course.durationHours,
      accent: course.accent,
      outcomes: JSON.stringify(course.outcomes),
      prerequisites: JSON.stringify(course.prerequisites),
      position: courseIndex,
    });

    const courseId = (findCourse.get(course.slug) as { id: string }).id;

    course.chapters.forEach((chapter, chapterIndex) => {
      upsertChapter.run({
        id: id('chp'),
        courseId,
        position: chapterIndex,
        title: chapter.title,
        summary: chapter.summary,
        content: chapter.content,
        estimatedMinutes: chapter.estimatedMinutes,
        passMark: chapter.passMark,
        rewardMinutes: chapter.rewardMinutes,
      });

      const chapterId = (findChapter.get(courseId, chapterIndex) as { id: string }).id;

      chapter.questions.forEach((question, questionIndex) => {
        upsertQuestion.run({
          id: id('qst'),
          chapterId,
          position: questionIndex,
          prompt: question.prompt,
          options: JSON.stringify(question.options),
          correctIndex: question.correctIndex,
          explanation: question.explanation,
        });
      });

      pruneQuestions.run(chapterId, chapter.questions.length);
    });

    pruneChapters.run(courseId, course.chapters.length);
  });
}

function seedAdmin(): void {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(config.admin.email);
  if (existing) return;

  db.prepare(
    `INSERT INTO users (id, full_name, email, password_hash, role, timezone)
     VALUES (?, ?, ?, ?, 'ADMIN', 'UTC')`,
  ).run(id('usr'), 'Programme Administrator', config.admin.email, hashPassword(config.admin.password));
}

export function runSeed(): { courses: number; chapters: number; questions: number } {
  transaction(() => {
    seedCatalog();
    seedAdmin();
  });

  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

  return { courses: count('courses'), chapters: count('chapters'), questions: count('questions') };
}

const invokedDirectly = process.argv[1]?.includes('seed');
if (invokedDirectly) {
  const result = runSeed();
  console.log(
    `Seed complete: ${result.courses} courses, ${result.chapters} chapters, ${result.questions} questions.`,
  );
  console.log(`Administrator account: ${config.admin.email}`);
}
