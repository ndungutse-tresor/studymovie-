import crypto from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { config } from '../config.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { syncOnce } from '../services/movies/index.js';

/**
 * Scheduled jobs. Vercel Cron calls these with `Authorization: Bearer
 * $CRON_SECRET`; without a configured secret the endpoints do not exist.
 */
export const cronRouter = Router();

function requireCronSecret(req: Request, _res: Response, next: NextFunction): void {
  if (!config.cronSecret) return next(HttpError.notFound());

  const presented = Buffer.from(req.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${config.cronSecret}`);
  if (presented.length !== expected.length || !crypto.timingSafeEqual(presented, expected)) {
    return next(HttpError.unauthorized());
  }
  next();
}

cronRouter.get(
  '/sync-movies',
  requireCronSecret,
  asyncHandler(async (_req, res) => {
    const summary = await syncOnce();
    console.log(`Movie sync: ${summary.added} new, ${summary.total} in library, ${summary.durationMs} ms`);
    res.json({ sync: summary });
  }),
);
