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
  asyncHandler((req, res) => {
    // Signed-in learners see their own progress folded into the catalogue.
    res.json({ courses: listCourses(req.user?.id) });
  }),
);

learningRouter.get(
  '/courses/:slug',
  asyncHandler((req, res) => {
    res.json({ course: getCourse(req.params.slug, req.user?.id) });
  }),
);

learningRouter.post(
  '/courses/:slug/enroll',
  requireAuth,
  asyncHandler((req, res) => {
    const courseId = courseIdFromSlug(req.params.slug);
    enroll(req.user!.id, courseId);
    res.status(201).json({ course: getCourse(req.params.slug, req.user!.id) });
  }),
);

learningRouter.get(
  '/chapters/:chapterId',
  requireAuth,
  asyncHandler((req, res) => {
    res.json({
      chapter: getChapter(req.user!.id, req.params.chapterId),
      study: studyStatus(req.user!.id, req.params.chapterId),
    });
  }),
);

learningRouter.post(
  '/chapters/:chapterId/study/start',
  requireAuth,
  asyncHandler((req, res) => {
    res.json({ study: beginStudy(req.user!.id, req.params.chapterId) });
  }),
);

learningRouter.get(
  '/chapters/:chapterId/study',
  requireAuth,
  asyncHandler((req, res) => {
    res.json({ study: studyStatus(req.user!.id, req.params.chapterId) });
  }),
);

learningRouter.post(
  '/chapters/:chapterId/study/complete',
  requireAuth,
  asyncHandler((req, res) => {
    res.json({ study: completeStudy(req.user!.id, req.params.chapterId) });
  }),
);

learningRouter.post(
  '/chapters/:chapterId/exam',
  requireAuth,
  asyncHandler((req, res) => {
    res.status(201).json({ exam: startExam(req.user!.id, req.params.chapterId) });
  }),
);

const answersSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(0).max(9)).default({}),
});

learningRouter.patch(
  '/exams/:attemptId',
  requireAuth,
  asyncHandler((req, res) => {
    const { answers } = answersSchema.parse(req.body);
    res.json(saveAnswers(req.user!.id, req.params.attemptId, answers));
  }),
);

learningRouter.post(
  '/exams/:attemptId/submit',
  requireAuth,
  asyncHandler((req, res) => {
    const { answers } = answersSchema.parse(req.body);
    res.json({ result: submitExam(req.user!.id, req.params.attemptId, answers) });
  }),
);
