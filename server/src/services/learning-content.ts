import { one, run, transaction } from '../db/index.js';
import { id } from '../lib/ids.js';
import { HttpError } from '../lib/http-error.js';
import { extractResourceText } from './learning-resources.js';
import type { DraftQuestion } from './question-generator.js';
import { resourceContentType } from './movies/storage.js';

export interface CourseLessonInput {
  course: {
    title: string;
    summary: string;
    description: string;
    category: string;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  };
  lesson: {
    title: string;
    summary: string;
    content: string;
    estimatedMinutes: number;
    passMark: number;
    rewardMinutes: number;
  };
  resources: { name: string; url: string; sizeBytes: number }[];
  questions: DraftQuestion[];
}

function courseSlug(title: string, courseId: string): string {
  const base = title
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${base || 'course'}-${courseId.slice(-8)}`;
}

export async function createCourseLesson(input: CourseLessonInput) {
  if (input.questions.length < 3) throw HttpError.badRequest('Add at least three reviewed exam questions.');
  if (input.resources.length === 0) throw HttpError.badRequest('Upload at least one learning resource.');

  const extracted = await Promise.all(
    input.resources.map(async (resource) => ({
      resource,
      text: await extractResourceText(resource.url),
    })),
  );
  const content = [input.lesson.content.trim(), ...extracted.map((entry) => entry.text)]
    .map((text, index) => index === 0 || !text ? text : `## ${input.resources[index - 1].name}\n\n${text}`)
    .filter(Boolean)
    .join('\n\n');
  if (content.trim().length < 100) {
    throw HttpError.badRequest('Add lesson notes or a text-based resource with at least 100 characters.');
  }

  const courseId = id('crs');
  const courseSlugValue = courseSlug(input.course.title, courseId);
  const chapterId = id('chp');

  await transaction(async () => {
    const coursePosition = await one<{ position: number }>(
      'SELECT COALESCE(MAX(position), -1) + 1 AS position FROM courses',
    );
    await run(
      `INSERT INTO courses
        (id, slug, title, summary, description, category, level, duration_hours, accent, outcomes, prerequisites, position, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'reel', '[]', '[]', ?, 1)`,
      courseId,
      courseSlugValue,
      input.course.title,
      input.course.summary,
      input.course.description,
      input.course.category,
      input.course.level,
      Math.max(1, input.lesson.estimatedMinutes / 60),
      coursePosition?.position ?? 0,
    );

    await run(
      `INSERT INTO chapters
        (id, course_id, position, title, summary, content, estimated_minutes, pass_mark, reward_minutes)
       VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      chapterId,
      courseId,
      input.lesson.title,
      input.lesson.summary,
      content,
      input.lesson.estimatedMinutes,
      input.lesson.passMark,
      input.lesson.rewardMinutes,
    );

    for (const [position, { resource, text }] of extracted.entries()) {
      const mimeType = resourceContentType(resource.name);
      if (!mimeType) throw HttpError.badRequest(`Unsupported learning resource: ${resource.name}`);
      await run(
        `INSERT INTO chapter_resources
          (id, chapter_id, position, file_name, resource_url, mime_type, size_bytes, extracted_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id('res'),
        chapterId,
        position,
        resource.name,
        resource.url,
        mimeType,
        resource.sizeBytes,
        text,
      );
    }

    for (const [position, question] of input.questions.entries()) {
      await run(
        `INSERT INTO questions
          (id, chapter_id, position, prompt, options, correct_index, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id('qst'),
        chapterId,
        position,
        question.prompt,
        JSON.stringify(question.options),
        question.correctIndex,
        question.explanation,
      );
    }
  });

  return { id: courseId, slug: courseSlugValue, chapterId, title: input.course.title };
}