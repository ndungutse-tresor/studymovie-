import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../lib/http-error.js';
import {
  activeReward,
  endRewardSession,
  getRewardSession,
  listRewardSessions,
  startRewardSession,
} from '../services/rewards.js';
import { findMovie, recordDecision } from '../services/movies/index.js';

export const rewardsRouter = Router();

rewardsRouter.use(requireAuth);

rewardsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ sessions: await listRewardSessions(req.user!.id) });
  }),
);

rewardsRouter.get(
  '/active',
  asyncHandler(async (req, res) => {
    res.json({ session: await activeReward(req.user!.id) });
  }),
);

rewardsRouter.get(
  '/:sessionId',
  asyncHandler(async (req, res) => {
    res.json({ session: await getRewardSession(req.user!.id, req.params.sessionId) });
  }),
);

/**
 * Starting a session pins the movie and fixes the expiry server-side. The
 * client counts down for display only; the authoritative clock is here.
 */
rewardsRouter.post(
  '/:sessionId/start',
  asyncHandler(async (req, res) => {
    const { movieId } = z.object({ movieId: z.string().min(1) }).parse(req.body);

    const movie = await findMovie(movieId);
    if (!movie) throw HttpError.notFound('That title is no longer available.');

    const session = await startRewardSession(req.user!.id, req.params.sessionId, {
      id: movie.id,
      title: movie.title,
      source: movie.source,
      streamUrl: movie.streamUrl,
      posterUrl: movie.posterUrl,
    });

    await recordDecision(req.user!.id, movie, 'WATCHED');

    res.json({ session, movie });
  }),
);

rewardsRouter.post(
  '/:sessionId/end',
  asyncHandler(async (req, res) => {
    res.json({ session: await endRewardSession(req.user!.id, req.params.sessionId) });
  }),
);
