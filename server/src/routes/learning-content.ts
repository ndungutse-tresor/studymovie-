import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { HttpError } from '../lib/http-error.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { createCourseLesson } from '../services/learning-content.js';
import { extractResourceText } from '../services/learning-resources.js';
import { generateQuestions } from '../services/question-generator.js';
import { createLearningResourceUploadTicket, resourceContentType } from '../services/movies/storage.js';

export const learningContentRouter = Router();

learningContentRouter.use(requireAuth, requireAdmin);

const resourceUpload = multer({
  storage: multer.diskStorage({
    destination: config.content.resourceUploadDir,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: config.content.uploadMaxBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!resourceContentType(file.originalname)) {
      callback(HttpError.badRequest('Choose a PDF, Word, PowerPoint, or video file.'));
      return;
    }
    callback(null, true);
  },
});

const resourceSchema = z.object({
  name: z.string().trim().min(1).max(255),
  url: z.string().trim().min(1).max(2000),
  sizeBytes: z.number().int().positive().max(config.content.uploadMaxBytes),
});

const generateSchema = z.object({
  courseTitle: z.string().trim().min(1).max(160),
  lessonTitle: z.string().trim().min(1).max(160),
  lessonContent: z.string().trim().max(30_000).default(''),
  resources: z.array(resourceSchema).max(10),
  questionCount: z.number().int().min(3).max(20).default(5),
});

const createSchema = z.object({
  course: z.object({
    title: z.string().trim().min(3).max(160),
    summary: z.string().trim().min(10).max(300),
    description: z.string().trim().min(10).max(2000),
    category: z.string().trim().min(2).max(80),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  }),
  lesson: z.object({
    title: z.string().trim().min(3).max(160),
    summary: z.string().trim().min(10).max(500),
    content: z.string().trim().max(30_000).default(''),
    estimatedMinutes: z.number().int().min(1).max(600),
    passMark: z.number().int().min(50).max(100),
    rewardMinutes: z.number().int().min(1).max(180),
  }),
  resources: z.array(resourceSchema).min(1).max(10),
  questions: z.array(z.object({
    prompt: z.string().trim().min(10).max(1000),
    options: z.array(z.string().trim().min(1).max(300)).length(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().min(1).max(1000),
  })).min(3).max(20),
});

learningContentRouter.get('/admin/upload-mode', (_req, res) => {
  res.json({
    mode: config.content.uploadMode,
    maxBytes: config.content.uploadMaxBytes,
    aiConfigured: Boolean(config.learning.deepSeekApiKey),
  });
});

learningContentRouter.post('/admin/upload-url', asyncHandler(async (req, res) => {
  if (config.content.uploadMode !== 'object') {
    throw new HttpError(503, 'UPLOAD_STORAGE_UNAVAILABLE', 'Cloud learning-resource storage is not configured.');
  }
  const { fileName, size } = z.object({ fileName: z.string().trim().min(1).max(255), size: z.number().int().positive() }).parse(req.body);
  res.json(await createLearningResourceUploadTicket(fileName, size));
}));

learningContentRouter.post('/admin/upload', (req, _res, next) => {
  if (config.content.uploadMode !== 'local') {
    next(new HttpError(503, 'UPLOAD_STORAGE_UNAVAILABLE', 'Local learning-resource uploads are disabled.'));
    return;
  }
  next();
}, resourceUpload.single('resource'), (req, res, next) => {
  if (!req.file) {
    next(HttpError.badRequest('Choose a learning resource to upload.'));
    return;
  }
  const mimeType = resourceContentType(req.file.originalname);
  if (!mimeType) {
    next(HttpError.badRequest('Unsupported learning resource type.'));
    return;
  }
  res.status(201).json({
    resource: {
      name: req.file.originalname.slice(0, 255),
      url: `/api/content/uploads/${req.file.filename}`,
      mimeType,
      sizeBytes: req.file.size,
    },
  });
});

const generationLimiter = rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false });

learningContentRouter.post('/admin/generate-questions', generationLimiter, asyncHandler(async (req, res) => {
  const input = generateSchema.parse(req.body);
  const resourceText = (await Promise.all(input.resources.map((resource) => extractResourceText(resource.url))))
    .filter(Boolean)
    .join('\n\n');
  const questions = await generateQuestions({ ...input, resourceText });
  res.json({ questions });
}));

learningContentRouter.post('/admin/courses', asyncHandler(async (req, res) => {
  res.status(201).json({ course: await createCourseLesson(createSchema.parse(req.body)) });
}));