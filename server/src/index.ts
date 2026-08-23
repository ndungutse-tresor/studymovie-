import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { config } from './config.js';
import { db } from './db/index.js';
import { runSeed } from './db/seed.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { applicationsRouter } from './routes/applications.js';
import { learningRouter } from './routes/learning.js';
import { rewardsRouter } from './routes/rewards.js';
import { moviesRouter } from './routes/movies.js';
import { scheduleRouter } from './routes/schedule.js';
import { dashboardRouter } from './routes/dashboard.js';
import { verifyAccessToken } from './lib/tokens.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The API serves JSON only; the client is a separate origin with its own CSP.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header: same-origin or a non-browser client.
        if (!origin) return callback(null, true);
        if (config.clientOrigins.includes(origin)) return callback(null, true);
        // Outside production, accept any loopback origin so the dev server can
        // run on whichever host and port is convenient.
        if (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        // Refuse by omitting the CORS headers rather than raising a 500.
        callback(null, false);
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  if (!config.isProduction) app.use(morgan('dev'));

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  /**
   * Attaches the caller when a valid token is present, without requiring one.
   * Public routes such as the catalogue use this to fold in personal progress.
   */
  app.use((req, _res, next) => {
    const header = req.header('authorization');
    if (!header?.toLowerCase().startsWith('bearer ')) return next();
    try {
      const payload = verifyAccessToken(header.slice(7).trim());
      const row = db
        .prepare('SELECT id, email, full_name, role, timezone, status FROM users WHERE id = ?')
        .get(payload.sub) as
        | {
            id: string;
            email: string;
            full_name: string;
            role: 'LEARNER' | 'ADMIN';
            timezone: string;
            status: string;
          }
        | undefined;
      if (row && row.status === 'ACTIVE') {
        req.user = {
          id: row.id,
          email: row.email,
          fullName: row.full_name,
          role: row.role,
          timezone: row.timezone,
        };
      }
    } catch {
      // An invalid token is simply ignored here; protected routes still reject it.
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'studyreel-api', time: new Date().toISOString() });
  });

  app.get('/api/ready', (_req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ status: 'ready' });
    } catch (error) {
      res.status(503).json({
        status: 'unavailable',
        detail: error instanceof Error ? error.message : 'database unreachable',
      });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/learning', learningRouter);
  app.use('/api/rewards', rewardsRouter);
  app.use('/api/movies', moviesRouter);
  app.use('/api/schedule', scheduleRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

function start() {
  const summary = runSeed();
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`StudyReel API listening on http://localhost:${config.port}`);
    console.log(
      `Catalog: ${summary.courses} courses, ${summary.chapters} chapters, ${summary.questions} questions.`,
    );
  });

  // Finish in-flight requests before exiting, so a deploy does not drop them.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down.`);
    server.close(() => {
      db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

const isEntrypoint = process.argv[1]?.includes('index');
if (isEntrypoint) start();
