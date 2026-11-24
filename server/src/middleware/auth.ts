import type { NextFunction, Request, Response } from 'express';
import { one } from '../db/index.js';
import { signInBlock } from '../lib/email-access.js';
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

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readBearer(req);
    if (!token) return next(HttpError.unauthorized());

    const payload = verifyAccessToken(token);
    const row = await one<{
      id: string;
      email: string;
      full_name: string;
      role: 'LEARNER' | 'ADMIN';
      timezone: string;
      status: string;
      email_verified_at: string | null;
      email_approved_at: string | null;
    }>(
      'SELECT id, email, full_name, role, timezone, status, email_verified_at, email_approved_at FROM users WHERE id = ?',
      payload.sub,
    );

    if (!row) return next(HttpError.unauthorized('Account no longer exists.'));
    if (row.status !== 'ACTIVE') return next(HttpError.forbidden('This account is suspended.'));
    // Checked on every request, so withdrawing an approval ends access at once.
    const blocked = signInBlock(row);
    if (blocked) return next(new HttpError(401, blocked.code, blocked.message));

    req.user = {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      timezone: row.timezone,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(HttpError.unauthorized());
  if (req.user.role !== 'ADMIN') return next(HttpError.forbidden('Administrator access required.'));
  next();
}
