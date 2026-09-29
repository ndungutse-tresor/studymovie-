import type { Movie } from './types.js';
import { fetchJson } from './http.js';
import { cleanTitle, isSuitable, normaliseGenres, popularityFromCount } from './normalise.js';

/**
 * Internet Archive provider.
 *
 * The Archive's `feature_films` and `film_noir` collections hold public-domain
 * and freely redistributable feature films with an open, key-free API. It is
 * used here in preference to unlicensed streaming sites: the catalogue is
 * genuinely free to watch and free to link to.
 *
 * Two feeds are read. The popular feed is the established catalogue, ranked by
 * downloads. The new-uploads feed is what makes the library grow: recently
 * added items carrying the Public Domain Mark and released before 1964. Both
 * conditions are required because the collection's newest uploads are mostly
 * later, still-copyrighted films, and self-applied Creative Commons tags there
 * are unreliable.
 */

const SEARCH_ENDPOINT = 'https://archive.org/advancedsearch.php';
const POPULAR_COLLECTIONS = ['feature_films', 'film_noir', 'classic_cartoons', 'silent_films'];
const FIELDS = ['identifier', 'title', 'year', 'description', 'subject', 'downloads', 'avg_rating', 'runtime', 'addeddate'];
const POPULAR_LATEST_YEAR = 1977;
const NEW_UPLOADS_LATEST_YEAR = 1963;

/** Any metadata field may arrive as a string, a number, or a list of either. */
type Field = string | number | (string | number)[] | null | undefined;

interface ArchiveDoc {
  identifier: string;
  title?: Field;
  year?: Field;
  description?: Field;
  subject?: Field;
  downloads?: number;
  avg_rating?: Field;
  runtime?: Field;
  addeddate?: Field;
}

interface ArchiveSearchResponse {
  response?: { numFound?: number; docs?: ArchiveDoc[] };
}

function first(value: Field): string {
  const single = Array.isArray(value) ? value[0] : value;
  return single === null || single === undefined ? '' : String(single);
}

function toArray(value: Field): string[] {
  if (value === null || value === undefined) return [];
  return (Array.isArray(value) ? value.map(String) : String(value).split(';'))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseRuntime(value: Field): number | null {
  const runtime = first(value);
  if (!runtime) return null;
  const parts = runtime.split(':').map((part) => Number.parseInt(part, 10));
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 3) return Math.round(parts[0] * 60 + parts[1] + parts[2] / 60);
  if (parts.length === 2) return Math.round(parts[0] + parts[1] / 60);
  return null;
}

function toMovie(doc: ArchiveDoc): Movie | null {
  if (!doc.identifier) return null;

  const description = first(doc.description)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawTitle = (first(doc.title) || doc.identifier).trim();
  const subjects = toArray(doc.subject);
  if (!isSuitable(rawTitle, subjects)) return null;

  const cleaned = cleanTitle(rawTitle);
  const declaredYear = Number.parseInt(first(doc.year), 10) || null;
  const rating = Number.parseFloat(first(doc.avg_rating));
  const addedAt = first(doc.addeddate) ? new Date(first(doc.addeddate)) : null;

  return {
    id: `archive:${doc.identifier}`,
    source: 'archive',
    title: cleaned.title,
    year: declaredYear ?? cleaned.year,
    synopsis: description.slice(0, 400),
    genres: normaliseGenres(subjects, rawTitle),
    runtimeMinutes: parseRuntime(doc.runtime),
    posterUrl: `https://archive.org/services/img/${doc.identifier}`,
    sourceUrl: `https://archive.org/details/${doc.identifier}`,
    streamUrl: null,
    embedUrl: `https://archive.org/embed/${doc.identifier}`,
    popularity: popularityFromCount(doc.downloads, 7),
    rating: Number.isFinite(rating) && rating > 0 ? Number(rating.toFixed(1)) : null,
    licence: 'Public domain or freely redistributable, via the Internet Archive',
    addedAt: addedAt && !Number.isNaN(addedAt.getTime()) ? addedAt.toISOString() : null,
  };
}

async function search(clauses: string[], sort: string, rows: number): Promise<Movie[]> {
  const params = new URLSearchParams();
  params.set('q', clauses.join(' AND '));
  for (const field of FIELDS) params.append('fl[]', field);
  params.append('sort[]', sort);
  params.set('rows', String(rows));
  params.set('page', '1');
  params.set('output', 'json');

  const payload = await fetchJson<ArchiveSearchResponse>(`${SEARCH_ENDPOINT}?${params.toString()}`);
  return (payload.response?.docs ?? [])
    .map((doc) => {
      // One malformed record must cost that record, not the whole feed.
      try {
        return toMovie(doc);
      } catch {
        return null;
      }
    })
    .filter((movie): movie is Movie => movie !== null)
    .filter((movie) => movie.title.length > 1);
}

/**
 * The established catalogue, most downloaded first. Limited to films released
 * before 1978: until then a US film without a copyright notice, or whose
 * copyright was not renewed, fell into the public domain, which is how most of
 * this collection is free. Later uploads here are far more likely to be
 * someone else's copyrighted film, and undated items are usually compilations.
 */
export function fetchArchivePopular(rows = 150): Promise<Movie[]> {
  return search(
    [`collection:(${POPULAR_COLLECTIONS.join(' OR ')})`, 'mediatype:(movies)', `year:[1880 TO ${POPULAR_LATEST_YEAR}]`],
    'downloads desc',
    rows,
  );
}

/** Recently uploaded public-domain features, newest first. */
export function fetchArchiveNewUploads(rows = 100): Promise<Movie[]> {
  return search(
    [
      'collection:(feature_films OR film_noir OR silent_films)',
      'mediatype:(movies)',
      'licenseurl:(*publicdomain*)',
      `year:[1880 TO ${NEW_UPLOADS_LATEST_YEAR}]`,
    ],
    'addeddate desc',
    rows,
  );
}
