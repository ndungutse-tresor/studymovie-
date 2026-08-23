import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error.js';
import { config } from '../config.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.notFound('No API route matches this request.'));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Some fields need attention.',
        fields: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  if (!config.isProduction) console.error(error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProduction ? 'Unexpected server error.' : message,
    },
  });
}
