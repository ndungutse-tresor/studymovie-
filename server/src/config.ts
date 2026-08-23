import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const rootDir = path.resolve(process.cwd());
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(rootDir, 'data');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function requiredSecret(name: string, fallbackFile: string): string {
  const fromEnv = process.env[name];
  if (fromEnv && fromEnv.length >= 16) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${name} must be set to a value of at least 16 characters in production. ` +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }

  // Development convenience: persist a generated secret so restarts do not invalidate sessions.
  const cachePath = path.join(dataDir, fallbackFile);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, 'utf8').trim();
  const generated = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(cachePath, generated, { mode: 0o600 });
  return generated;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: int('PORT', 4000),
  dataDir,
  databaseFile: process.env.DATABASE_FILE
    ? path.resolve(process.env.DATABASE_FILE)
    : path.join(dataDir, 'studyreel.sqlite'),

  auth: {
    accessSecret: requiredSecret('JWT_ACCESS_SECRET', '.access-secret'),
    refreshSecret: requiredSecret('JWT_REFRESH_SECRET', '.refresh-secret'),
    accessTtlSeconds: int('ACCESS_TOKEN_TTL', 60 * 30),
    refreshTtlSeconds: int('REFRESH_TOKEN_TTL', 60 * 60 * 24 * 14),
    bcryptRounds: int('BCRYPT_ROUNDS', 12),
  },

  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),

  learning: {
    /** Minimum seconds a learner must spend on a chapter before the exam unlocks. */
    minimumStudySeconds: int('MIN_STUDY_SECONDS', 120),
    /** How long an exam attempt stays open before it is auto-submitted. */
    examWindowSeconds: int('EXAM_WINDOW_SECONDS', 60 * 20),
    /** Cool-down between failed attempts, in seconds. */
    retryCooldownSeconds: int('RETRY_COOLDOWN_SECONDS', 60 * 5),
    maxAttemptsBeforeCooldown: int('MAX_ATTEMPTS_BEFORE_COOLDOWN', 2),
  },

  movies: {
    tmdbApiKey: process.env.TMDB_API_KEY ?? '',
    cacheTtlMinutes: int('MOVIE_CACHE_TTL_MINUTES', 180),
    requestTimeoutMs: int('MOVIE_REQUEST_TIMEOUT_MS', 12_000),
  },

  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@studyreel.io',
    password: process.env.ADMIN_PASSWORD ?? 'ChangeMe!2024',
  },
} as const;

export type AppConfig = typeof config;
