import type { Movie, MovieQuery } from './types.js';
import { fetchJson } from './http.js';

/**
 * Internet Archive provider.
 *
 * The Archive's `feature_films` and `film_noir` collections hold public-domain
 * and freely redistributable feature films with an open, key-free API. It is
 * used here in preference to unlicensed streaming sites: the catalogue is
 * genuinely free to watch and free to link to.
 */

const SEARCH_ENDPOINT = 'https://archive.org/advancedsearch.php';
const COLLECTIONS = ['feature_films', 'film_noir', 'classic_cartoons', 'silent_films'];

interface ArchiveDoc {
  identifier: string;
  title?: string;
  year?: string | number;
  description?: string | string[];
  subject?: string | string[];
  downloads?: number;
  avg_rating?: string | number;
  runtime?: string;
}

interface ArchiveSearchResponse {
  response?: { numFound?: number; docs?: ArchiveDoc[] };
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split(';'))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseRuntime(runtime: string | undefined): number | null {
  if (!runtime) return null;
  const parts = runtime.split(':').map((part) => Number.parseInt(part, 10));
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 3) return Math.round(parts[0] * 60 + parts[1] + parts[2] / 60);
  if (parts.length === 2) return Math.round(parts[0] + parts[1] / 60);
  return null;
}

/** Downloads span several orders of magnitude, so compress them onto 0-100. */
function popularityFromDownloads(downloads: number | undefined): number {
  if (!downloads || downloads <= 0) return 0;
  const scaled = (Math.log10(downloads) / 7) * 100;
  return Math.max(1, Math.min(100, Math.round(scaled)));
}

function toMovie(doc: ArchiveDoc): Movie | null {
  if (!doc.identifier) return null;

  const description = first(doc.description)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rating = doc.avg_rating ? Number.parseFloat(String(doc.avg_rating)) : null;

  return {
    id: `archive:${doc.identifier}`,
    source: 'archive',
    title: (doc.title ?? doc.identifier).trim(),
    year: doc.year ? Number.parseInt(String(doc.year), 10) || null : null,
    synopsis: description.slice(0, 400),
    genres: toArray(doc.subject).slice(0, 4),
    runtimeMinutes: parseRuntime(doc.runtime),
    posterUrl: `https://archive.org/services/img/${doc.identifier}`,
    sourceUrl: `https://archive.org/details/${doc.identifier}`,
    streamUrl: null,
    embedUrl: `https://archive.org/embed/${doc.identifier}`,
    popularity: popularityFromDownloads(doc.downloads),
    rating: rating && Number.isFinite(rating) ? Number(rating.toFixed(1)) : null,
    licence: 'Public domain or freely redistributable, via the Internet Archive',
  };
}

export async function fetchArchiveMovies(query: MovieQuery = {}): Promise<Movie[]> {
  const limit = Math.min(query.limit ?? 40, 100);
  const clauses = [
    `collection:(${COLLECTIONS.join(' OR ')})`,
    'mediatype:(movies)',
  ];
  if (query.search) clauses.push(`title:(${sanitise(query.search)})`);
  if (query.genre) clauses.push(`subject:(${sanitise(query.genre)})`);

  const params = new URLSearchParams();
  params.set('q', clauses.join(' AND '));
  for (const field of ['identifier', 'title', 'year', 'description', 'subject', 'downloads', 'avg_rating', 'runtime']) {
    params.append('fl[]', field);
  }
  params.append('sort[]', 'downloads desc');
  params.set('rows', String(limit));
  params.set('page', '1');
  params.set('output', 'json');

  const payload = await fetchJson<ArchiveSearchResponse>(`${SEARCH_ENDPOINT}?${params.toString()}`);
  const docs = payload.response?.docs ?? [];

  return docs
    .map(toMovie)
    .filter((movie): movie is Movie => movie !== null)
    .filter((movie) => movie.title.length > 1);
}

/** Strips Lucene syntax so a search box cannot inject query operators. */
function sanitise(value: string): string {
  return value.replace(/[^\w\s'-]/g, ' ').trim().slice(0, 80) || '*';
}
