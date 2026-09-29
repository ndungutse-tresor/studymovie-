import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../lib/http-error.js';
import {
  browseMovies,
  clearDecision,
  decisionMap,
  findMovie,
  listDecisions,
  personalise,
  recordDecision,
  syncOnce,
} from '../services/movies/index.js';

export const moviesRouter = Router();

moviesRouter.use(requireAuth);

const querySchema = z.object({
  search: z.string().trim().max(80).optional(),
  genre: z.string().trim().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** The browse page: ranked list, top rail, newest arrivals. Declined titles are filtered out. */
moviesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = querySchema.parse(req.query);
    const { movies, recent, genres, sources, lastSyncedAt } = await browseMovies(filters);
    const decisions = await decisionMap(req.user!.id);
    const personalised = personalise(movies, decisions);

    res.json({
      movies: personalised,
      // Already ordered by playability and popularity in the library.
      top: personalised.slice(0, 10),
      recent: personalise(recent, decisions),
      genres,
      sources,
      lastSyncedAt,
    });
  }),
);

moviesRouter.get(
  '/list',
  asyncHandler(async (req, res) => {
    const { decision } = z
      .object({ decision: z.enum(['WATCH_LATER', 'DECLINED', 'WATCHED']).optional() })
      .parse(req.query);
    res.json({ items: await listDecisions(req.user!.id, decision) });
  }),
);

/** Pulls every source now, rather than waiting for the scheduled run. */
moviesRouter.post(
  '/sync',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json({ sync: await syncOnce() });
  }),
);

/** One title, for the player. */
moviesRouter.get(
  '/:movieId',
  asyncHandler(async (req, res) => {
    const movie = await findMovie(req.params.movieId);
    if (!movie) throw HttpError.notFound('That title is no longer available.');
    res.json({ movie });
  }),
);

/**
 * Free-time viewing decisions. "Watch later" saves a title; "decline" removes it
 * from future recommendations.
 */
moviesRouter.post(
  '/:movieId/decision',
  asyncHandler(async (req, res) => {
    const { decision } = z
      .object({ decision: z.enum(['WATCH_LATER', 'DECLINED', 'WATCHED']) })
      .parse(req.body);

    const movie = await findMovie(req.params.movieId);
    if (!movie) throw HttpError.notFound('That title is no longer available.');

    res.json(await recordDecision(req.user!.id, movie, decision));
  }),
);

moviesRouter.delete(
  '/:movieId/decision',
  asyncHandler(async (req, res) => {
    res.json(await clearDecision(req.user!.id, req.params.movieId));
  }),
);
