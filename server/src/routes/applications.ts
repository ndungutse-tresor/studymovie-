import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { HttpError } from '../lib/http-error.js';
import {
  TRACKS,
  TRACK_LABELS,
  decideApplication,
  findApplicationByEmail,
  getApplication,
  publicApplication,
  submitApplication,
} from '../services/admissions.js';

export const applicationsRouter = Router();

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const applicationSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  country: z.string().trim().max(80).optional().or(z.literal('')),
  track: z.enum(TRACKS),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  weeklyHours: z.coerce.number().int().min(1).max(40),
  motivation: z.string().trim().min(1, 'Tell us why you are applying.').max(2000),
});

applicationsRouter.get('/tracks', (_req, res) => {
  res.json({
    tracks: TRACKS.map((track) => ({ value: track, label: TRACK_LABELS[track] })),
    levels: [
      { value: 'BEGINNER', label: 'Beginner', description: 'New to the field, or self-taught basics only.' },
      {
        value: 'INTERMEDIATE',
        label: 'Intermediate',
        description: 'Comfortable building and shipping with guidance.',
      },
      {
        value: 'ADVANCED',
        label: 'Advanced',
        description: 'Working professionally and looking to deepen architecture-level judgement.',
      },
    ],
  });
});

applicationsRouter.post(
  '/',
  applyLimiter,
  asyncHandler((req, res) => {
    const input = applicationSchema.parse(req.body);
    const record = submitApplication({
      ...input,
      phone: input.phone || undefined,
      country: input.country || undefined,
    });
    res.status(201).json({ application: publicApplication(record) });
  }),
);

applicationsRouter.get(
  '/status',
  asyncHandler((req, res) => {
    const query = z
      .object({
        reference: z.string().trim().optional(),
        email: z.string().trim().email().optional(),
      })
      .parse(req.query);

    if (!query.reference && !query.email) {
      throw HttpError.badRequest('Provide your application reference or the email you applied with.');
    }

    const record = query.reference
      ? getApplication(query.reference)
      : findApplicationByEmail(query.email!);

    if (!record) throw HttpError.notFound('No application matches those details.');
    // Both identifiers must agree when supplied, so a reference alone cannot be
    // guessed against another applicant's email.
    if (query.reference && query.email && record.email !== query.email.toLowerCase()) {
      throw HttpError.notFound('No application matches those details.');
    }

    res.json({ application: publicApplication(record) });
  }),
);

applicationsRouter.get(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler((req, res) => {
    const { status } = z
      .object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ENROLLED']).optional() })
      .parse(req.query);

    const rows = status
      ? db.prepare('SELECT * FROM applications WHERE status = ? ORDER BY created_at DESC').all(status)
      : db.prepare('SELECT * FROM applications ORDER BY created_at DESC LIMIT 200').all();

    res.json({
      applications: (rows as Parameters<typeof publicApplication>[0][]).map(publicApplication),
    });
  }),
);

applicationsRouter.post(
  '/:id/decision',
  requireAuth,
  requireAdmin,
  asyncHandler((req, res) => {
    const { decision, note } = z
      .object({
        decision: z.enum(['APPROVED', 'REJECTED']),
        note: z.string().trim().max(500).default(''),
      })
      .parse(req.body);

    const record = decideApplication(req.params.id, decision, note);
    res.json({ application: publicApplication(record) });
  }),
);
