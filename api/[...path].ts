import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/dist/app.js';

/**
 * Vercel serverless entry point.
 *
 * The Express application is created once per warm instance and reused across
 * invocations, so the Postgres pool is not rebuilt on every request. Vercel
 * routes every `/api/**` path here (see the catch-all filename), and the
 * original URL is preserved, so the app's own `/api/...` mounts still match.
 */
const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (request: IncomingMessage, response: ServerResponse) => void)(req, res);
}
