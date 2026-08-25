import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../lib/http-error.js';
import {
  aggregateMovies,
  availableGenres,
  clearDecision,
  decisionMap,
  findMovie,
  listDecisions,
  personalise,
  recordDecision,
} from '../services/movies/index.js';

export const moviesRouter = Router();

moviesRouter.use(requireAuth);

const querySchema = z.object({
  search: z.string().trim().max(80).optional(),
  genre: z.string().trim().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** The browse and "top movies" rail. Declined titles are filtered out. */
moviesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = querySchema.parse(req.query);
    const { movies, sources, fromCache } = await aggregateMovies(filters);
    const decisions = await decisionMap(req.user!.id);
    const personalised = personalise(movies, decisions);

    res.json({
      movies: personalised,
      // Already ordered by popularity in the aggregator.
      top: personalised.slice(0, 10),
      genres: availableGenres(movies),
      sources,
      fromCache,
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
