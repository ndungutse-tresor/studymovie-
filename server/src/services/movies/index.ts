import { config } from '../../config.js';
import { db, nowIso, parseSqlDate } from '../../db/index.js';
import { id as newId } from '../../lib/ids.js';
import { HttpError } from '../../lib/http-error.js';
import { fetchArchiveMovies } from './archive.js';
import { fetchTmdbMovies, tmdbEnabled } from './tmdb.js';
import { catalogMovies, catalogGenres } from './catalog.js';
import type { Movie, MovieQuery } from './types.js';

export type { Movie, MovieQuery, MovieSource } from './types.js';

export type Decision = 'WATCH_LATER' | 'DECLINED' | 'WATCHED';

interface PreferenceRow {
  movie_id: string;
  decision: Decision;
  title: string;
  poster_url: string | null;
  source: string | null;
  year: number | null;
  payload: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Source aggregation with a database-backed cache
// ---------------------------------------------------------------------------

function cacheKey(query: MovieQuery): string {
  return `movies:${query.search ?? ''}:${query.genre ?? ''}:${query.limit ?? 60}`;
}

function readCache(key: string): Movie[] | null {
  const row = db.prepare('SELECT payload, fetched_at FROM movie_cache WHERE cache_key = ?').get(key) as
    | { payload: string; fetched_at: string }
    | undefined;
  if (!row) return null;

  const fetchedAt = parseSqlDate(row.fetched_at);
  if (!fetchedAt) return null;

  const ageMinutes = (Date.now() - fetchedAt.getTime()) / 60_000;
  if (ageMinutes > config.movies.cacheTtlMinutes) return null;

  try {
    return JSON.parse(row.payload) as Movie[];
  } catch {
    return null;
  }
}

function writeCache(key: string, movies: Movie[]): void {
  db.prepare(
    `INSERT INTO movie_cache (cache_key, payload, fetched_at) VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
  ).run(key, JSON.stringify(movies), nowIso());
}

function dedupe(movies: Movie[]): Movie[] {
  const seen = new Map<string, Movie>();
  for (const movie of movies) {
    // Collapse the same film arriving from two providers, preferring the
    // playable one.
    const fingerprint = `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '')}:${movie.year ?? ''}`;
    const existing = seen.get(fingerprint);
    if (!existing) {
      seen.set(fingerprint, movie);
      continue;
    }
    const existingPlayable = Boolean(existing.embedUrl ?? existing.streamUrl);
    const candidatePlayable = Boolean(movie.embedUrl ?? movie.streamUrl);
    if (candidatePlayable && !existingPlayable) seen.set(fingerprint, movie);
  }
  return [...seen.values()];
}

function matchesQuery(movie: Movie, query: MovieQuery): boolean {
  if (query.search) {
    const needle = query.search.toLowerCase();
    if (!movie.title.toLowerCase().includes(needle) && !movie.synopsis.toLowerCase().includes(needle)) {
      return false;
    }
  }
  if (query.genre) {
    const genre = query.genre.toLowerCase();
    if (!movie.genres.some((entry) => entry.toLowerCase() === genre)) return false;
  }
  return true;
}

export interface AggregateResult {
  movies: Movie[];
  sources: { name: string; status: 'ok' | 'unavailable' | 'disabled'; count: number; detail?: string }[];
  fromCache: boolean;
}

/**
 * Pulls from every configured free source, falling back to the bundled
 * public-domain catalogue so the rails are never empty. Source failures are
 * reported rather than thrown: one provider being unreachable must not take the
 * whole page down.
 */
export async function aggregateMovies(query: MovieQuery = {}): Promise<AggregateResult> {
  const key = cacheKey(query);
  const cached = readCache(key);
  if (cached) {
    return {
      movies: cached,
      sources: [{ name: 'cache', status: 'ok', count: cached.length }],
      fromCache: true,
    };
  }

  const sources: AggregateResult['sources'] = [];
  const collected: Movie[] = [];

  const settled = await Promise.allSettled([
    fetchArchiveMovies(query),
    tmdbEnabled() ? fetchTmdbMovies(query) : Promise.resolve<Movie[]>([]),
  ]);

  const [archive, tmdb] = settled;

  if (archive.status === 'fulfilled') {
    collected.push(...archive.value);
    sources.push({ name: 'Internet Archive', status: 'ok', count: archive.value.length });
  } else {
    sources.push({
      name: 'Internet Archive',
      status: 'unavailable',
      count: 0,
      detail: archive.reason instanceof Error ? archive.reason.message : 'Request failed',
    });
  }

  if (!tmdbEnabled()) {
    sources.push({ name: 'TMDB', status: 'disabled', count: 0, detail: 'Set TMDB_API_KEY to enable' });
  } else if (tmdb.status === 'fulfilled') {
    collected.push(...tmdb.value);
    sources.push({ name: 'TMDB', status: 'ok', count: tmdb.value.length });
  } else {
    sources.push({
      name: 'TMDB',
      status: 'unavailable',
      count: 0,
      detail: tmdb.reason instanceof Error ? tmdb.reason.message : 'Request failed',
    });
  }

  const fallback = catalogMovies.filter((movie) => matchesQuery(movie, query));
  collected.push(...fallback);
  sources.push({ name: 'Bundled catalogue', status: 'ok', count: fallback.length });

  const movies = dedupe(collected)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, query.limit ?? 60);

  // Only cache a result that included at least one live source, so a transient
  // outage does not pin the catalogue-only view for the whole TTL.
  if (sources.some((source) => source.status === 'ok' && source.name !== 'Bundled catalogue')) {
    writeCache(key, movies);
  }

  return { movies, sources, fromCache: false };
}

export function availableGenres(movies: Movie[]): string[] {
  const genres = new Set<string>(catalogGenres);
  for (const movie of movies) for (const genre of movie.genres) genres.add(genre);
  return [...genres].sort();
}

// ---------------------------------------------------------------------------
// Per-learner decisions: watch later, decline, watched
// ---------------------------------------------------------------------------

export function recordDecision(userId: string, movie: Movie, decision: Decision) {
  db.prepare(
    `INSERT INTO movie_preferences (id, user_id, movie_id, decision, title, poster_url, source, year, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, movie_id) DO UPDATE SET
       decision = excluded.decision,
       title = excluded.title,
       poster_url = excluded.poster_url,
       source = excluded.source,
       year = excluded.year,
       payload = excluded.payload,
       created_at = datetime('now')`,
  ).run(
    newId('mpf'),
    userId,
    movie.id,
    decision,
    movie.title,
    movie.posterUrl,
    movie.source,
    movie.year,
    JSON.stringify(movie),
  );

  return { movieId: movie.id, decision };
}

export function clearDecision(userId: string, movieId: string) {
  const result = db
    .prepare('DELETE FROM movie_preferences WHERE user_id = ? AND movie_id = ?')
    .run(userId, movieId);
  if (result.changes === 0) throw HttpError.notFound('That title is not on your list.');
  return { movieId, removed: true };
}

export function listDecisions(userId: string, decision?: Decision) {
  const rows = decision
    ? (db
        .prepare('SELECT * FROM movie_preferences WHERE user_id = ? AND decision = ? ORDER BY created_at DESC')
        .all(userId, decision) as PreferenceRow[])
    : (db
        .prepare('SELECT * FROM movie_preferences WHERE user_id = ? ORDER BY created_at DESC')
        .all(userId) as PreferenceRow[]);

  return rows.map((row) => {
    let movie: Movie | null = null;
    try {
      movie = JSON.parse(row.payload) as Movie;
    } catch {
      movie = null;
    }
    return {
      movieId: row.movie_id,
      decision: row.decision,
      title: row.title,
      posterUrl: row.poster_url,
      source: row.source,
      year: row.year,
      decidedAt: parseSqlDate(row.created_at)?.toISOString() ?? null,
      movie,
    };
  });
}

export function decisionMap(userId: string): Map<string, Decision> {
  const rows = db
    .prepare('SELECT movie_id, decision FROM movie_preferences WHERE user_id = ?')
    .all(userId) as { movie_id: string; decision: Decision }[];
  return new Map(rows.map((row) => [row.movie_id, row.decision]));
}

/** Declined titles drop out of recommendations; saved ones are flagged. */
export function personalise(movies: Movie[], decisions: Map<string, Decision>) {
  return movies
    .filter((movie) => decisions.get(movie.id) !== 'DECLINED')
    .map((movie) => ({ ...movie, decision: decisions.get(movie.id) ?? null }));
}

/** Resolves a movie by id from the aggregate, for reward-session selection. */
export async function findMovie(movieId: string): Promise<Movie | null> {
  const fromCatalog = catalogMovies.find((movie) => movie.id === movieId);
  if (fromCatalog) return fromCatalog;

  const { movies } = await aggregateMovies({ limit: 100 });
  return movies.find((movie) => movie.id === movieId) ?? null;
}
