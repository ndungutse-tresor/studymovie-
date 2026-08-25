import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { courseIdFromSlug, getChapter, getCourse, listCourses } from '../services/courses.js';
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
