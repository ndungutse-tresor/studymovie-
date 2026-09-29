export type MovieSource = 'archive' | 'youtube' | 'tmdb' | 'catalog';

export interface Movie {
  /** Stable, source-prefixed identifier, e.g. `archive:night_of_the_living_dead`. */
  id: string;
  source: MovieSource;
  title: string;
  year: number | null;
  synopsis: string;
  genres: string[];
  runtimeMinutes: number | null;
  posterUrl: string | null;
  /** Page a viewer can open at the source, for attribution and fallback. */
  sourceUrl: string | null;
  /** Direct media URL, when the source exposes one. */
  streamUrl: string | null;
  /** Embeddable player URL, preferred over streamUrl when both exist. */
  embedUrl: string | null;
  /** 0-100 popularity used for the "top movies" ranking. */
  popularity: number;
  rating: number | null;
  /** Short licence note shown in the UI. */
  licence: string;
  /** When the source published the title (ISO 8601), if it says. */
  addedAt?: string | null;
}

export interface MovieQuery {
  search?: string;
  genre?: string;
  limit?: number;
}
