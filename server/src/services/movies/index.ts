import { parseSqlDate, query, run } from '../../db/index.js';
import { id as newId } from '../../lib/ids.js';
import { HttpError } from '../../lib/http-error.js';
import { catalogMovies } from './catalog.js';
import { ensureLibrary, findInLibrary, libraryGenres, listLibrary, recentLibrary, sourceStates } from './library.js';
import type { Movie, MovieQuery } from './types.js';

export type { Movie, MovieQuery, MovieSource } from './types.js';
export { syncMovies, syncOnce, type SyncSummary } from './library.js';

export type Decision = 'WATCH_LATER' | 'DECLINED' | 'WATCHED';

interface PreferenceRow {
  movie_id: string;
  decision: Decision;
  title: string;
  poster_url: string | null;
  source: string | null;
  year: number | null;
  payload: string;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Browsing the library
// ---------------------------------------------------------------------------

/**
 * Everything the film pages need, read from the synced library: the ranked
 * list, the newest arrivals, the genre filter, and each source's last sync.
 */
export async function browseMovies(filters: MovieQuery = {}) {
  await ensureLibrary();

  const filtered = Boolean(filters.search || filters.genre);
  const [movies, recent, genres, sources] = await Promise.all([
    listLibrary(filters),
    filtered ? Promise.resolve<Movie[]>([]) : recentLibrary(),
    libraryGenres(),
    sourceStates(),
  ]);

  const lastSyncedAt =
    sources
      .map((source) => source.syncedAt)
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1) ?? null;

  return { movies, recent, genres, sources, lastSyncedAt };
}

// ---------------------------------------------------------------------------
// Per-learner decisions: watch later, decline, watched
// ---------------------------------------------------------------------------

export async function recordDecision(userId: string, movie: Movie, decision: Decision) {
  await run(
    `INSERT INTO movie_preferences (id, user_id, movie_id, decision, title, poster_url, source, year, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, movie_id) DO UPDATE SET
       decision = excluded.decision,
       title = excluded.title,
       poster_url = excluded.poster_url,
       source = excluded.source,
       year = excluded.year,
       payload = excluded.payload,
       created_at = now()`,
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

export async function clearDecision(userId: string, movieId: string) {
  const removed = await run(
    'DELETE FROM movie_preferences WHERE user_id = ? AND movie_id = ?',
    userId,
    movieId,
  );
  if (removed === 0) throw HttpError.notFound('That title is not on your list.');
  return { movieId, removed: true };
}

export async function listDecisions(userId: string, decision?: Decision) {
  const rows = decision
    ? await query<PreferenceRow>(
        'SELECT * FROM movie_preferences WHERE user_id = ? AND decision = ? ORDER BY created_at DESC',
        userId,
        decision,
      )
    : await query<PreferenceRow>(
        'SELECT * FROM movie_preferences WHERE user_id = ? ORDER BY created_at DESC',
        userId,
      );

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

export async function decisionMap(userId: string): Promise<Map<string, Decision>> {
  const rows = await query<{ movie_id: string; decision: Decision }>(
    'SELECT movie_id, decision FROM movie_preferences WHERE user_id = ?',
    userId,
  );
  return new Map(rows.map((row) => [row.movie_id, row.decision]));
}

/** Declined titles drop out of recommendations; saved ones are flagged. */
export function personalise(movies: Movie[], decisions: Map<string, Decision>) {
  return movies
    .filter((movie) => decisions.get(movie.id) !== 'DECLINED')
    .map((movie) => ({ ...movie, decision: decisions.get(movie.id) ?? null }));
}

/** Resolves one title by id, for the player and for reward-session selection. */
export async function findMovie(movieId: string): Promise<Movie | null> {
  const stored = await findInLibrary(movieId);
  if (stored) return stored;
  // The bundled catalogue answers even before the first sync has run.
  return catalogMovies.find((movie) => movie.id === movieId) ?? null;
}
