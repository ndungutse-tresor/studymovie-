import type { Movie, MovieQuery } from './types.js';
import { config } from '../../config.js';
import { fetchJson } from './http.js';

/**
 * TMDB provider — optional, enabled by setting TMDB_API_KEY.
 *
 * TMDB is a metadata source, not a stream source: it supplies the ranking,
 * artwork, and synopses behind the "top movies" rail. Titles surfaced from here
 * carry no stream URL, so a reward session started against one shows the
 * catalogue entry and its source link rather than an embedded player.
 */

const BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  popularity?: number;
  genre_ids?: number[];
}

interface TmdbResponse {
  results?: TmdbMovie[];
}

const GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export function tmdbEnabled(): boolean {
  return config.movies.tmdbApiKey.length > 0;
}

function toMovie(entry: TmdbMovie): Movie {
  return {
    id: `tmdb:${entry.id}`,
    source: 'tmdb',
    title: entry.title,
    year: entry.release_date ? Number.parseInt(entry.release_date.slice(0, 4), 10) || null : null,
    synopsis: (entry.overview ?? '').slice(0, 400),
    genres: (entry.genre_ids ?? []).map((genreId) => GENRES[genreId]).filter(Boolean).slice(0, 4),
    runtimeMinutes: null,
    posterUrl: entry.poster_path ? `${IMAGE_BASE}${entry.poster_path}` : null,
    sourceUrl: `https://www.themoviedb.org/movie/${entry.id}`,
    streamUrl: null,
    embedUrl: null,
    popularity: Math.max(1, Math.min(100, Math.round((entry.popularity ?? 0) / 5))),
    rating: entry.vote_average ? Number(entry.vote_average.toFixed(1)) : null,
    licence: 'Metadata via TMDB. Streaming availability varies by region.',
  };
}

export async function fetchTmdbMovies(query: MovieQuery = {}): Promise<Movie[]> {
  if (!tmdbEnabled()) return [];

  const params = new URLSearchParams({
    api_key: config.movies.tmdbApiKey,
    language: 'en-US',
    page: '1',
  });

  let endpoint: string;
  if (query.search) {
    params.set('query', query.search);
    params.set('include_adult', 'false');
    endpoint = `${BASE}/search/movie?${params.toString()}`;
  } else {
    endpoint = `${BASE}/movie/popular?${params.toString()}`;
  }

  const payload = await fetchJson<TmdbResponse>(endpoint);
  return (payload.results ?? []).slice(0, query.limit ?? 40).map(toMovie);
}
