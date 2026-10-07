import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const envFile =
  process.env.DOTENV_CONFIG_PATH ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
loadEnv({ path: envFile });

const rootDir = path.resolve(process.cwd());
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(rootDir, 'data');
const movieStorageSettings = {
  bucket: process.env.MOVIE_STORAGE_BUCKET ?? '',
  region: process.env.MOVIE_STORAGE_REGION || 'us-east-1',
  endpoint: process.env.MOVIE_STORAGE_ENDPOINT ?? '',
  accessKeyId: process.env.MOVIE_STORAGE_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.MOVIE_STORAGE_SECRET_ACCESS_KEY ?? '',
  publicUrl: process.env.MOVIE_STORAGE_PUBLIC_URL?.replace(/\/+$/, '') ?? '',
  forcePathStyle: process.env.MOVIE_STORAGE_FORCE_PATH_STYLE === 'true',
};
const hasMovieStorageSettings = Boolean(
  movieStorageSettings.bucket ||
    movieStorageSettings.endpoint ||
    movieStorageSettings.accessKeyId ||
    movieStorageSettings.secretAccessKey ||
    movieStorageSettings.publicUrl ||
    process.env.MOVIE_STORAGE_FORCE_PATH_STYLE,
);
const hasCompleteMovieStorageSettings = Boolean(
  movieStorageSettings.bucket &&
    movieStorageSettings.region &&
    movieStorageSettings.accessKeyId &&
    movieStorageSettings.secretAccessKey &&
    movieStorageSettings.publicUrl,
);

if (hasMovieStorageSettings && !hasCompleteMovieStorageSettings) {
  throw new Error(
    'Movie object storage requires MOVIE_STORAGE_BUCKET, MOVIE_STORAGE_REGION, ' +
      'MOVIE_STORAGE_ACCESS_KEY_ID, MOVIE_STORAGE_SECRET_ACCESS_KEY, and MOVIE_STORAGE_PUBLIC_URL.',
  );
}

const movieUploadDir = process.env.MOVIE_UPLOAD_DIR
  ? path.resolve(process.env.MOVIE_UPLOAD_DIR)
  : process.env.VERCEL
    ? path.join('/tmp', 'studyreel-movie-uploads')
    : path.join(dataDir, 'movie-uploads');
const learningResourceUploadDir = process.env.LEARNING_RESOURCE_UPLOAD_DIR
  ? path.resolve(process.env.LEARNING_RESOURCE_UPLOAD_DIR)
  : process.env.VERCEL
    ? path.join('/tmp', 'studyreel-learning-resources')
    : path.join(dataDir, 'learning-resources');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(movieUploadDir)) fs.mkdirSync(movieUploadDir, { recursive: true });
if (!fs.existsSync(learningResourceUploadDir)) fs.mkdirSync(learningResourceUploadDir, { recursive: true });

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

function requiredDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? '';
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Point it at your Postgres instance, for example ' +
        'postgresql://user:password@host:6543/postgres',
    );
  }
  return url;
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

  /**
   * Postgres connection string. In serverless deployments this must point at a
   * pooled endpoint (Supabase's transaction pooler on port 6543), because each
   * invocation opens its own connections and the direct port exhausts quickly.
   */
  databaseUrl: requiredDatabaseUrl(),
  databasePoolMax: int('DATABASE_POOL_MAX', process.env.VERCEL ? 1 : 10),
  databaseSsl: (process.env.DATABASE_SSL ?? 'true') !== 'false',

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
    deepSeekApiKey: process.env.DEEPSEEK_API_KEY ?? '',
    deepSeekModel: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
  },

  content: {
    resourceUploadDir: learningResourceUploadDir,
    uploadMode: hasCompleteMovieStorageSettings ? 'object' : process.env.NODE_ENV === 'production' ? 'disabled' : 'local',
    uploadMaxBytes: int('RESOURCE_UPLOAD_MAX_MB', 4096) * 1024 * 1024,
  },

  movies: {
    uploadDir: movieUploadDir,
    storage: {
      ...movieStorageSettings,
      enabled: hasCompleteMovieStorageSettings,
      forcePathStyle: process.env.MOVIE_STORAGE_FORCE_PATH_STYLE
        ? process.env.MOVIE_STORAGE_FORCE_PATH_STYLE === 'true'
        : Boolean(movieStorageSettings.endpoint),
    },
    uploadMode: hasCompleteMovieStorageSettings ? 'object' : process.env.NODE_ENV === 'production' ? 'disabled' : 'local',
    uploadMaxBytes: int('MOVIE_UPLOAD_MAX_MB', 4096) * 1024 * 1024,
    tmdbApiKey: process.env.TMDB_API_KEY ?? '',
    requestTimeoutMs: int('MOVIE_REQUEST_TIMEOUT_MS', 12_000),
    /**
     * A page view triggers a sync itself only when the library has gone this
     * long without one — a safety net for when the scheduled job has not run.
     */
    syncStaleHours: int('MOVIE_SYNC_STALE_HOURS', 26),
    /** YouTube Data API key; the YouTube source is off without it. */
    youtubeApiKey: process.env.YOUTUBE_API_KEY ?? '',
    /** Channel IDs (UC...), @handles, or playlist IDs (PL...), comma-separated. */
    youtubeSources: (process.env.YOUTUBE_SOURCES ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    /** Shorter uploads are trailers and clips, not films. */
    youtubeMinMinutes: int('YOUTUBE_MIN_MINUTES', 40),
  },

  /** Shared secret Vercel Cron sends as a bearer token to scheduled endpoints. */
  cronSecret: process.env.CRON_SECRET ?? '',

  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@studyreel.io',
    password: process.env.ADMIN_PASSWORD ?? 'ChangeMe!2024',
  },
} as const;

export type AppConfig = typeof config;
