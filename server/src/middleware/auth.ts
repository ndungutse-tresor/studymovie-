import type { NextFunction, Request, Response } from 'express';
import { db } from '../db/index.js';
import { HttpError } from '../lib/http-error.js';
import { verifyAccessToken } from '../lib/tokens.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: 'LEARNER' | 'ADMIN';
  timezone: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function readBearer(req: Request): string | null {
  const header = req.header('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readBearer(req);
  if (!token) return next(HttpError.unauthorized());

  const payload = verifyAccessToken(token);
  const row = db
    .prepare('SELECT id, email, full_name, role, timezone, status FROM users WHERE id = ?')
    .get(payload.sub) as
    | { id: string; email: string; full_name: string; role: 'LEARNER' | 'ADMIN'; timezone: string; status: string }
    | undefined;

  if (!row) return next(HttpError.unauthorized('Account no longer exists.'));
  if (row.status !== 'ACTIVE') return next(HttpError.forbidden('This account is suspended.'));

  req.user = {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    timezone: row.timezone,
  };
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(HttpError.unauthorized());
  if (req.user.role !== 'ADMIN') return next(HttpError.forbidden('Administrator access required.'));
  next();
}
