import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { courseIdFromSlug, getChapter, getCourse, listCourses } from '../services/courses.js';
import { answerLessonQuestion } from '../services/study-assistant.js';
import {
  beginStudy,
  completeStudy,
  enroll,
  saveAnswers,
  startExam,
  studyStatus,
  submitExam,
} from '../services/progression.js';

export const learningRouter = Router();

const assistantLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

learningRouter.get(
  '/courses',
  asyncHandler(async (req, res) => {
    // Signed-in learners see their own progress folded into the catalogue.
    res.json({ courses: await listCourses(req.user?.id) });
  }),
);

learningRouter.get(
  '/courses/:slug',
  asyncHandler(async (req, res) => {
    res.json({ course: await getCourse(req.params.slug, req.user?.id) });
  }),
);

learningRouter.post(
  '/courses/:slug/enroll',
  requireAuth,
  asyncHandler(async (req, res) => {
    const courseId = await courseIdFromSlug(req.params.slug);
    await enroll(req.user!.id, courseId);
    res.status(201).json({ course: await getCourse(req.params.slug, req.user!.id) });
  }),
);

learningRouter.get(
  '/chapters/:chapterId',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      chapter: await getChapter(req.user!.id, req.params.chapterId),
      study: await studyStatus(req.user!.id, req.params.chapterId),
    });
  }),
);

learningRouter.post(
  '/chapters/:chapterId/assistant',
  requireAuth,
  assistantLimiter,
  asyncHandler(async (req, res) => {
    const { message, history } = z
      .object({
        message: z.string().trim().min(1).max(1500),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().trim().min(1).max(1500),
        })).max(8).default([]),
      })
      .parse(req.body);
    const chapter = await getChapter(req.user!.id, req.params.chapterId);
    const reply = await answerLessonQuestion({
      courseTitle: chapter.course.title,
      lessonTitle: chapter.title,
      lessonContent: chapter.content,
      history,
      message,
    });
    res.json({ reply });
  }),
);

learningRouter.post(
  '/chapters/:chapterId/study/start',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ study: await beginStudy(req.user!.id, req.params.chapterId) });
  }),
);

learningRouter.get(
  '/chapters/:chapterId/study',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ study: await studyStatus(req.user!.id, req.params.chapterId) });
  }),
);

learningRouter.post(
  '/chapters/:chapterId/study/complete',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ study: await completeStudy(req.user!.id, req.params.chapterId) });
  }),
);

learningRouter.post(
  '/chapters/:chapterId/exam',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(201).json({ exam: await startExam(req.user!.id, req.params.chapterId) });
  }),
);

const answersSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(0).max(9)).default({}),
});

learningRouter.patch(
  '/exams/:attemptId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { answers } = answersSchema.parse(req.body);
    res.json(await saveAnswers(req.user!.id, req.params.attemptId, answers));
  }),
);

learningRouter.post(
  '/exams/:attemptId/submit',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { answers } = answersSchema.parse(req.body);
    res.json({ result: await submitExam(req.user!.id, req.params.attemptId, answers) });
  }),
);
