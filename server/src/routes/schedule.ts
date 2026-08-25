import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  acknowledgeAlert,
  createSchedule,
  deleteSchedule,
  listSchedules,
  updateSchedule,
  upcomingOccurrences,
} from '../services/schedule.js';

export const scheduleRouter = Router();

scheduleRouter.use(requireAuth);

const scheduleSchema = z.object({
  title: z.string().trim().min(2, 'Give the session a name.').max(80),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use 24-hour HH:MM.'),
  durationMinutes: z.coerce.number().int().min(15).max(300),
  reminderMinutes: z.coerce.number().int().min(0).max(120),
  courseId: z.string().nullish(),
  active: z.boolean().optional(),
});

scheduleRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const [schedules, upcoming] = await Promise.all([
      listSchedules(req.user!.id, req.user!.timezone),
      upcomingOccurrences(req.user!.id, req.user!.timezone),
    ]);
    res.json({ schedules, upcoming });
  }),
);

/** Polled by the client so a due session raises an alert without a push subscription. */
scheduleRouter.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const occurrences = await upcomingOccurrences(req.user!.id, req.user!.timezone, 2);
    res.json({
      due: occurrences.filter((occurrence) => occurrence.alertDue),
      next: occurrences.find((occurrence) => occurrence.minutesUntilStart >= 0) ?? null,
    });
  }),
);

scheduleRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = scheduleSchema.parse(req.body);
    res.status(201).json({
      schedule: await createSchedule(req.user!.id, req.user!.timezone, {
        ...input,
        courseId: input.courseId ?? null,
      }),
    });
  }),
);

scheduleRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = scheduleSchema.partial().parse(req.body);
    res.json({
      schedule: await updateSchedule(req.user!.id, req.user!.timezone, req.params.id, {
        ...input,
        courseId: input.courseId === undefined ? undefined : (input.courseId ?? null),
      }),
    });
  }),
);

scheduleRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await deleteSchedule(req.user!.id, req.params.id));
  }),
);

scheduleRouter.post(
  '/:id/acknowledge',
  asyncHandler(async (req, res) => {
    const { occurrence } = z.object({ occurrence: z.string().min(10) }).parse(req.body);
    res.json(await acknowledgeAlert(req.user!.id, req.params.id, occurrence));
  }),
);
