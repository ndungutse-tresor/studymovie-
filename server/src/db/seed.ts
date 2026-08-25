import { one, pool, run, transaction } from './index.js';
import { catalog } from './content/index.js';
import { id } from '../lib/ids.js';
import { hashPassword } from '../lib/passwords.js';
import { config } from '../config.js';

/**
 * Idempotent seeding: courses are matched by slug and their chapters and
 * questions are rebuilt, so editing lesson content and re-running the seed
 * updates existing rows instead of duplicating the catalog.
 */
async function seedCatalog(): Promise<void> {
  for (const [courseIndex, course] of catalog.entries()) {
    await run(
      `INSERT INTO courses (id, slug, title, summary, description, category, level, duration_hours, accent, outcomes, prerequisites, position, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT (slug) DO UPDATE SET
         title = excluded.title,
         summary = excluded.summary,
         description = excluded.description,
         category = excluded.category,
         level = excluded.level,
         duration_hours = excluded.duration_hours,
         accent = excluded.accent,
         outcomes = excluded.outcomes,
         prerequisites = excluded.prerequisites,
         position = excluded.position`,
      id('crs'),
      course.slug,
      course.title,
      course.summary,
      course.description,
      course.category,
      course.level,
      course.durationHours,
      course.accent,
      JSON.stringify(course.outcomes),
      JSON.stringify(course.prerequisites),
      courseIndex,
    );

    const courseRow = await one<{ id: string }>('SELECT id FROM courses WHERE slug = ?', course.slug);
    const courseId = courseRow!.id;

    for (const [chapterIndex, chapter] of course.chapters.entries()) {
      await run(
        `INSERT INTO chapters (id, course_id, position, title, summary, content, estimated_minutes, pass_mark, reward_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (course_id, position) DO UPDATE SET
           title = excluded.title,
           summary = excluded.summary,
           content = excluded.content,
           estimated_minutes = excluded.estimated_minutes,
           pass_mark = excluded.pass_mark,
           reward_minutes = excluded.reward_minutes`,
        id('chp'),
        courseId,
        chapterIndex,
        chapter.title,
        chapter.summary,
        chapter.content,
        chapter.estimatedMinutes,
        chapter.passMark,
        chapter.rewardMinutes,
      );

      const chapterRow = await one<{ id: string }>(
        'SELECT id FROM chapters WHERE course_id = ? AND position = ?',
        courseId,
        chapterIndex,
      );
      const chapterId = chapterRow!.id;

      for (const [questionIndex, question] of chapter.questions.entries()) {
        await run(
          `INSERT INTO questions (id, chapter_id, position, prompt, options, correct_index, explanation)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (chapter_id, position) DO UPDATE SET
             prompt = excluded.prompt,
             options = excluded.options,
             correct_index = excluded.correct_index,
             explanation = excluded.explanation`,
          id('qst'),
          chapterId,
          questionIndex,
          question.prompt,
          JSON.stringify(question.options),
          question.correctIndex,
          question.explanation,
        );
      }

      await run('DELETE FROM questions WHERE chapter_id = ? AND position >= ?', chapterId, chapter.questions.length);
    }

    await run('DELETE FROM chapters WHERE course_id = ? AND position >= ?', courseId, course.chapters.length);
  }
}

async function seedAdmin(): Promise<void> {
  const existing = await one<{ id: string }>('SELECT id FROM users WHERE email = ?', config.admin.email);
  if (existing) return;

  await run(
    `INSERT INTO users (id, full_name, email, password_hash, role, timezone)
     VALUES (?, ?, ?, ?, 'ADMIN', 'UTC')`,
    id('usr'),
    'Programme Administrator',
    config.admin.email,
    hashPassword(config.admin.password),
  );
}

export async function runSeed(): Promise<{ courses: number; chapters: number; questions: number }> {
  await transaction(async () => {
    await seedCatalog();
    await seedAdmin();
  });

  const count = async (table: string) =>
    (await one<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))!.n;

  return {
    courses: await count('courses'),
    chapters: await count('chapters'),
    questions: await count('questions'),
  };
}

const invokedDirectly = process.argv[1]?.includes('seed');
if (invokedDirectly) {
  runSeed()
    .then(async (result) => {
      console.log(
        `Seed complete: ${result.courses} courses, ${result.chapters} chapters, ${result.questions} questions.`,
      );
      console.log(`Administrator account: ${config.admin.email}`);
      await pool.end();
    })
    .catch(async (error) => {
      console.error('Seed failed:', error);
      process.exitCode = 1;
      await pool.end();
    });
}
