import { config } from '../../config.js';
import { one, parseSqlDate, query, run } from '../../db/index.js';
import { fetchArchiveNewUploads, fetchArchivePopular } from './archive.js';
import { fetchYoutubeMovies, youtubeEnabled } from './youtube.js';
import { fetchTmdbMovies, tmdbEnabled } from './tmdb.js';
import { catalogMovies } from './catalog.js';
import type { Movie, MovieQuery, MovieSource } from './types.js';

/**
 * The film library.
 *
 * A scheduled sync pulls every free source into `movie_library`; browsing reads
 * only from that table. Page views therefore never wait on an upstream
 * provider, and a film a source publishes appears on the next sync without any
 * change here.
 */

interface LibraryRow {
  id: string;
  source: MovieSource;
  title: string;
  year: number | null;
  synopsis: string;
  genres: string[];
  runtime_minutes: number | null;
  poster_url: string | null;
  source_url: string | null;
  stream_url: string | null;
  embed_url: string | null;
  popularity: number;
  rating: number | null;
  licence: string;
  added_at: Date | null;
}

function fromRow(row: LibraryRow): Movie {
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    year: row.year,
    synopsis: row.synopsis,
    genres: row.genres ?? [],
    runtimeMinutes: row.runtime_minutes,
    posterUrl: row.poster_url,
    sourceUrl: row.source_url,
    streamUrl: row.stream_url,
    embedUrl: row.embed_url,
    popularity: row.popularity,
    rating: row.rating === null ? null : Number(Number(row.rating).toFixed(1)),
    licence: row.licence,
    addedAt: parseSqlDate(row.added_at)?.toISOString() ?? null,
  };
}

const playable = (movie: Movie) => Boolean(movie.embedUrl ?? movie.streamUrl);

/**
 * Collapses the same film arriving more than once — two uploads of it, or a
 * bundled entry and a live one — keeping the first (callers order best-first)
 * unless a later copy is playable and the kept one is not. Years within one of
 * each other count as the same film; further apart is a remake.
 */
export function dedupe(movies: Movie[]): Movie[] {
  const kept: Movie[] = [];
  const byTitle = new Map<string, Movie[]>();

  for (const movie of movies) {
    const key = movie.title.toLowerCase().replace(/^(the|a|an)\s+/, '').replace(/[^a-z0-9]/g, '');
    const group = byTitle.get(key) ?? [];
    const twin = group.find(
      (other) => other.year === null || movie.year === null || Math.abs(other.year - movie.year) <= 1,
    );

    if (!twin) {
      group.push(movie);
      byTitle.set(key, group);
      kept.push(movie);
    } else if (playable(movie) && !playable(twin)) {
      kept[kept.indexOf(twin)] = movie;
      group[group.indexOf(twin)] = movie;
    }
  }

  return kept;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

type SourceStatus = 'ok' | 'unavailable' | 'disabled';

export interface SourceSummary {
  name: string;
  status: SourceStatus;
  fetched: number;
  added: number;
  detail?: string;
}

export interface SyncSummary {
  sources: SourceSummary[];
  added: number;
  total: number;
  durationMs: number;
}

interface SourceDefinition {
  name: string;
  source: MovieSource;
  enabled: boolean;
  disabledDetail?: string;
  fetch: () => Promise<{ movies: Movie[]; errors: string[] }>;
}

const UPSERT_BATCH = 40;
const COLUMNS = [
  'id', 'source', 'title', 'year', 'synopsis', 'genres', 'runtime_minutes', 'poster_url', 'source_url',
  'stream_url', 'embed_url', 'popularity', 'rating', 'licence', 'added_at',
];

function toParams(movie: Movie): unknown[] {
  return [
    movie.id,
    movie.source,
    movie.title.slice(0, 300),
    movie.year,
    movie.synopsis,
    movie.genres,
    movie.runtimeMinutes,
    movie.posterUrl,
    movie.sourceUrl,
    movie.streamUrl,
    movie.embedUrl,
    Math.round(movie.popularity),
    movie.rating,
    movie.licence,
    movie.addedAt ?? null,
  ];
}

/** Inserts new titles and refreshes known ones. Returns how many were new. */
async function upsertMovies(movies: Movie[]): Promise<number> {
  // A batch may not touch the same row twice, and two feeds can return one item.
  const unique = [...new Map(movies.map((movie) => [movie.id, movie])).values()];
  if (unique.length === 0) return 0;

  const existing = await query<{ id: string }>(
    'SELECT id FROM movie_library WHERE id = ANY(?)',
    unique.map((movie) => movie.id),
  );
  const known = new Set(existing.map((row) => row.id));

  const placeholders = `(${COLUMNS.map(() => '?').join(', ')})`;
  for (let start = 0; start < unique.length; start += UPSERT_BATCH) {
    const batch = unique.slice(start, start + UPSERT_BATCH);
    await run(
      `INSERT INTO movie_library (${COLUMNS.join(', ')})
       VALUES ${batch.map(() => placeholders).join(', ')}
       ON CONFLICT (id) DO UPDATE SET
         source = excluded.source,
         title = excluded.title,
         year = excluded.year,
         synopsis = excluded.synopsis,
         genres = excluded.genres,
         runtime_minutes = excluded.runtime_minutes,
         poster_url = excluded.poster_url,
         source_url = excluded.source_url,
         stream_url = excluded.stream_url,
         embed_url = excluded.embed_url,
         popularity = excluded.popularity,
         rating = excluded.rating,
         licence = excluded.licence,
         added_at = COALESCE(excluded.added_at, movie_library.added_at),
         last_seen_at = now()`,
      ...batch.flatMap(toParams),
    );
  }

  return unique.filter((movie) => !known.has(movie.id)).length;
}

async function recordSource(summary: SourceSummary, source: MovieSource): Promise<void> {
  const count = await one<{ n: string | number }>('SELECT COUNT(*) AS n FROM movie_library WHERE source = ?', source);
  await run(
    `INSERT INTO movie_sources (name, status, item_count, added, detail, synced_at)
     VALUES (?, ?, ?, ?, ?, now())
     ON CONFLICT (name) DO UPDATE SET
       status = excluded.status,
       item_count = excluded.item_count,
       added = excluded.added,
       detail = excluded.detail,
       synced_at = excluded.synced_at`,
    summary.name,
    summary.status,
    Number(count?.n ?? 0),
    summary.added,
    summary.detail ?? null,
  );
}

function sourceDefinitions(): SourceDefinition[] {
  return [
    {
      name: 'Internet Archive',
      source: 'archive',
      enabled: true,
      fetch: async () => {
        const [popular, fresh] = await Promise.allSettled([fetchArchivePopular(), fetchArchiveNewUploads()]);
        const movies = [popular, fresh].flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
        const errors = [popular, fresh].flatMap((result) =>
          result.status === 'rejected' ? [result.reason instanceof Error ? result.reason.message : 'failed'] : [],
        );
        if (movies.length === 0 && errors.length > 0) throw new Error(errors[0]);
        return { movies, errors };
      },
    },
    {
      name: 'YouTube',
      source: 'youtube',
      enabled: youtubeEnabled(),
      disabledDetail: 'Set YOUTUBE_API_KEY and YOUTUBE_SOURCES to follow channels',
      fetch: async () => {
        const result = await fetchYoutubeMovies();
        if (result.movies.length === 0 && result.errors.length > 0) throw new Error(result.errors.join('; '));
        return result;
      },
    },
    {
      name: 'TMDB',
      source: 'tmdb',
      enabled: tmdbEnabled(),
      disabledDetail: 'Set TMDB_API_KEY to enable',
      fetch: async () => ({ movies: await fetchTmdbMovies({ limit: 40 }), errors: [] }),
    },
    {
      name: 'Bundled catalogue',
      source: 'catalog',
      enabled: true,
      fetch: async () => ({ movies: catalogMovies, errors: [] }),
    },
  ];
}

/**
 * Pulls every enabled source into the library. A source failing is recorded
 * against that source and never aborts the others.
 */
export async function syncMovies(): Promise<SyncSummary> {
  const started = Date.now();
  const definitions = sourceDefinitions();

  const fetched = await Promise.allSettled(
    definitions.map((definition) => (definition.enabled ? definition.fetch() : Promise.resolve(null))),
  );

  const sources: SourceSummary[] = [];
  for (const [index, definition] of definitions.entries()) {
    const result = fetched[index];
    let summary: SourceSummary;

    if (!definition.enabled) {
      summary = { name: definition.name, status: 'disabled', fetched: 0, added: 0, detail: definition.disabledDetail };
    } else if (result.status === 'rejected' || result.value === null) {
      const reason = result.status === 'rejected' && result.reason instanceof Error ? result.reason.message : 'failed';
      summary = { name: definition.name, status: 'unavailable', fetched: 0, added: 0, detail: reason.slice(0, 300) };
    } else {
      const { movies, errors } = result.value;
      const added = await upsertMovies(movies);
      summary = {
        name: definition.name,
        status: 'ok',
        fetched: movies.length,
        added,
        detail: errors.length ? `Partly updated — ${errors.join('; ')}`.slice(0, 300) : undefined,
      };
    }

    await recordSource(summary, definition.source);
    sources.push(summary);
  }

  const total = await one<{ n: string | number }>('SELECT COUNT(*) AS n FROM movie_library');
  return {
    sources,
    // The bundled catalogue is not news, so it does not count toward "added".
    added: sources.filter((source) => source.name !== 'Bundled catalogue').reduce((sum, source) => sum + source.added, 0),
    total: Number(total?.n ?? 0),
    durationMs: Date.now() - started,
  };
}

let inflight: Promise<SyncSummary> | null = null;

/** Joins a sync already running in this instance rather than starting another. */
export function syncOnce(): Promise<SyncSummary> {
  inflight ??= syncMovies().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * The safety net behind the scheduled sync. An empty library is filled before
 * the request continues; a stale one is refreshed in the background, so the
 * page still answers from what is already stored.
 */
export async function ensureLibrary(): Promise<void> {
  const state = await one<{ total: string | number; last: Date | null }>(
    'SELECT (SELECT COUNT(*) FROM movie_library) AS total, (SELECT MAX(synced_at) FROM movie_sources) AS last',
  );

  if (Number(state?.total ?? 0) === 0) {
    await syncOnce();
    return;
  }

  const last = parseSqlDate(state?.last ?? null);
  if (!last || Date.now() - last.getTime() > config.movies.syncStaleHours * 3_600_000) {
    void syncOnce().catch((error: unknown) => console.error('Background movie sync failed:', error));
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** Playable titles first, then by popularity. */
export async function listLibrary(filters: MovieQuery = {}): Promise<Movie[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    const like = `%${escapeLike(filters.search)}%`;
    where.push('(title ILIKE ? OR synopsis ILIKE ?)');
    params.push(like, like);
  }
  if (filters.genre) {
    where.push('? = ANY(genres)');
    params.push(filters.genre);
  }

  const limit = Math.min(filters.limit ?? 60, 100);
  const rows = await query<LibraryRow>(
    `SELECT * FROM movie_library
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY (embed_url IS NOT NULL OR stream_url IS NOT NULL) DESC, popularity DESC, title ASC
     LIMIT ?`,
    ...params,
    limit * 2,
  );

  return dedupe(rows.map(fromRow)).slice(0, limit);
}

/** The newest playable titles by the date their source published them. */
export async function recentLibrary(limit = 12): Promise<Movie[]> {
  const rows = await query<LibraryRow>(
    `SELECT * FROM movie_library
     WHERE added_at IS NOT NULL AND (embed_url IS NOT NULL OR stream_url IS NOT NULL)
     ORDER BY added_at DESC
     LIMIT ?`,
    limit * 3,
  );
  return dedupe(rows.map(fromRow)).slice(0, limit);
}

export async function libraryGenres(): Promise<string[]> {
  const rows = await query<{ genre: string }>(
    'SELECT DISTINCT unnest(genres) AS genre FROM movie_library ORDER BY genre',
  );
  return rows.map((row) => row.genre);
}

export async function findInLibrary(movieId: string): Promise<Movie | null> {
  const row = await one<LibraryRow>('SELECT * FROM movie_library WHERE id = ?', movieId);
  return row ? fromRow(row) : null;
}

export interface SourceState {
  name: string;
  status: SourceStatus;
  count: number;
  added: number;
  detail?: string;
  syncedAt: string | null;
}

export async function sourceStates(): Promise<SourceState[]> {
  const rows = await query<{
    name: string;
    status: SourceStatus;
    item_count: number;
    added: number;
    detail: string | null;
    synced_at: Date;
  }>('SELECT name, status, item_count, added, detail, synced_at FROM movie_sources ORDER BY name');

  return rows.map((row) => ({
    name: row.name,
    status: row.status,
    count: row.item_count,
    added: row.added,
    detail: row.detail ?? undefined,
    syncedAt: parseSqlDate(row.synced_at)?.toISOString() ?? null,
  }));
}
