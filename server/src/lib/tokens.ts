import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from './http-error.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: 'LEARNER' | 'ADMIN';
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.auth.accessSecret, {
    expiresIn: config.auth.accessTtlSeconds,
    issuer: 'studyreel',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, config.auth.accessSecret, { issuer: 'studyreel' });
    if (typeof decoded === 'string') throw new Error('Unexpected token payload');
    return decoded as unknown as AccessTokenPayload;
  } catch {
    throw HttpError.unauthorized('Your session has expired. Sign in again.');
  }
}
