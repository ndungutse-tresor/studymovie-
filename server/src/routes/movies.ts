import { Router } from 'express';
import express from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../lib/http-error.js';
import type { ManagedMovieInput } from '../services/movies/types.js';
import {
  browseMovies,
  clearDecision,
  createManagedMovie,
  deleteManagedMovie,
  decisionMap,
  findMovie,
  listManagedMovies,
  listDecisions,
  personalise,
  recordDecision,
  syncOnce,
  updateManagedMovie,
} from '../services/movies/index.js';
import { createMovieUploadTicket, movieContentType } from '../services/movies/storage.js';

export const moviesRouter = Router();

const movieUpload = multer({
  storage: multer.diskStorage({
    destination: config.movies.uploadDir,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: config.movies.uploadMaxBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!movieContentType(file.originalname)) {
      callback(HttpError.badRequest('Choose an MP4, WebM, OGG, MOV, M4V, or MKV video file.'));
      return;
    }
    callback(null, true);
  },
});

moviesRouter.use(requireAuth);

const querySchema = z.object({
  search: z.string().trim().max(80).optional(),
  genre: z.string().trim().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const managedMovieSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    year: z.number().int().min(1888).max(2200).nullable(),
    synopsis: z.string().trim().max(5000),
    genres: z.array(z.string().trim().min(1).max(40)).max(12),
    runtimeMinutes: z.number().int().min(1).max(600).nullable(),
    posterUrl: z.string().trim().url().nullable(),
    sourceUrl: z.string().trim().url().nullable(),
    streamUrl: z.string().trim().nullable(),
    embedUrl: z.string().trim().url().nullable(),
    licence: z.string().trim().max(200),
  })
  .refine((movie) => movie.streamUrl || movie.embedUrl, {
    message: 'Add a hosted video or embed URL.',
  });

function validMovieUrls(movie: ManagedMovieInput): boolean {
  const isHttpUrl = (value: string | null) => {
    if (value === null) return true;
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  };
  const isLocalUpload = movie.streamUrl !== null &&
    /^\/api\/movies\/uploads\/[a-f0-9-]{36}\.(mp4|webm|ogg|mov|m4v|mkv)$/i.test(movie.streamUrl);
  return isHttpUrl(movie.posterUrl) && isHttpUrl(movie.sourceUrl) && isHttpUrl(movie.embedUrl) &&
    (isHttpUrl(movie.streamUrl) || isLocalUpload);
}

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

moviesRouter.get(
  '/admin/upload-mode',
  requireAdmin,
  (_req, res) => {
    res.json({ mode: config.movies.uploadMode });
  },
);

moviesRouter.post(
  '/admin/upload-url',
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (config.movies.uploadMode !== 'object') {
      throw new HttpError(503, 'UPLOAD_STORAGE_UNAVAILABLE', 'Cloud object storage is not configured.');
    }
    const { fileName, size } = z
      .object({ fileName: z.string().trim().min(1).max(255), size: z.number().int().positive() })
      .parse(req.body);
    res.json(await createMovieUploadTicket(fileName, size));
  }),
);

moviesRouter.get(
  '/admin/library',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json({ movies: await listManagedMovies() });
  }),
);

moviesRouter.post(
  '/admin/upload',
  requireAdmin,
  (_req, _res, next) => {
    if (config.movies.uploadMode !== 'local') {
      next(new HttpError(503, 'UPLOAD_STORAGE_UNAVAILABLE', 'Local file uploads are disabled.'));
      return;
    }
    next();
  },
  movieUpload.single('video'),
  (req, res, next) => {
    if (!req.file) {
      next(HttpError.badRequest('Choose a video file to upload.'));
      return;
    }
    res.status(201).json({ streamUrl: `/api/movies/uploads/${req.file.filename}` });
  },
);

moviesRouter.post(
  '/admin/library',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = managedMovieSchema.parse(req.body);
    if (!validMovieUrls(input)) throw HttpError.badRequest('Movie links must use HTTP or HTTPS.');
    res.status(201).json({ movie: await createManagedMovie(input) });
  }),
);

moviesRouter.patch(
  '/admin/library/:movieId',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = managedMovieSchema.parse(req.body);
    if (!validMovieUrls(input)) throw HttpError.badRequest('Movie links must use HTTP or HTTPS.');
    const movie = await updateManagedMovie(req.params.movieId, input);
    if (!movie) throw HttpError.notFound('That managed movie could not be found.');
    res.json({ movie });
  }),
);

moviesRouter.delete(
  '/admin/library/:movieId',
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!(await deleteManagedMovie(req.params.movieId))) {
      throw HttpError.notFound('That managed movie could not be found.');
    }
    res.status(204).end();
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
