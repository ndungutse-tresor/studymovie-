import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { Movie, MovieSourceStatus, RewardSession } from '../lib/types';
import GalleryWall, { type WallItem } from '../components/gallery/GalleryWall';
import { ReelHeader } from '../components/gallery/ReelHeader';
import { FilmArt } from '../components/gallery/FilmArt';
import { ScheduleAlerts } from '../components/ScheduleAlerts';
import '../components/gallery/gallery.css';

interface MoviesPayload {
  movies: Movie[];
  top: Movie[];
  genres: string[];
  sources: MovieSourceStatus[];
  fromCache: boolean;
}

interface Room {
  key: string;
  title: string;
  blurb: string;
  films: Movie[];
}

const POSTER_ASPECT = 2 / 3;
const MAX_GENRE_ROOMS = 4;

function caption(movie: Movie): [string, string] {
  const meta = [movie.year, movie.genres[0]].filter(Boolean).join(' · ');
  return [meta || 'Feature film', movie.title];
}

/**
 * The movie catalog as a curved screening-room wall: the top ten first, then a
 * few rooms by genre. Clicking a poster flies it into the film page.
 */
export default function MoviesGallery() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const genre = params.get('genre');
  const [payload, setPayload] = useState<MoviesPayload | null>(null);
  const [reward, setReward] = useState<RewardSession | null | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [movies, active] = await Promise.all([
        api.get<MoviesPayload>('/movies?limit=60'),
        api.get<{ session: RewardSession | null }>('/rewards/active'),
      ]);
      setPayload(movies);
      setReward(active.session);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The film catalog could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rooms = useMemo<Room[]>(() => {
    if (!payload) return [];
    const needle = search.trim().toLowerCase();
    const matches = (movie: Movie) =>
      (!genre || movie.genres.includes(genre)) &&
      (!needle || movie.title.toLowerCase().includes(needle) || movie.synopsis.toLowerCase().includes(needle));

    if (genre || needle) {
      const films = payload.movies.filter(matches);
      return films.length
        ? [{ key: 'results', title: genre ?? 'Search', blurb: `${films.length} ${films.length === 1 ? 'film' : 'films'}`, films }]
        : [];
    }

    const top = payload.top.slice(0, 10);
    const shown = new Set(top.map((movie) => movie.id));
    const result: Room[] = [{ key: 'top', title: `Top ${top.length} right now`, blurb: 'Ranked by popularity across sources.', films: top }];

    const byGenre = new Map<string, Movie[]>();
    for (const movie of payload.movies) {
      if (shown.has(movie.id)) continue;
      const first = movie.genres[0] ?? 'More films';
      byGenre.set(first, [...(byGenre.get(first) ?? []), movie]);
    }
    const ranked = [...byGenre.entries()].sort((a, b) => b[1].length - a[1].length);
    const rest: Movie[] = [];
    ranked.forEach(([name, films], index) => {
      if (index < MAX_GENRE_ROOMS && films.length >= 3 && name !== 'More films') {
        result.push({ key: `genre-${name}`, title: name, blurb: 'Free to watch, public domain.', films });
      } else rest.push(...films);
    });
    if (rest.length) result.push({ key: 'more', title: 'More in the catalog', blurb: 'Everything else, free to watch.', films: rest });
    return result.filter((room) => room.films.length > 0);
  }, [payload, search, genre]);

  const items = useMemo<WallItem[]>(
    () =>
      rooms.flatMap((room) => [
        {
          key: `placard-${room.key}`,
          kind: 'placard' as const,
          aspect: 0.64,
          label: `${room.title}: ${room.films.length} films`,
          content: (
            <span className="gs-placard">
              <strong>{room.title}</strong>
              <span>{room.blurb}</span>
              <small>{room.films.length} films</small>
            </span>
          ),
        },
        ...room.films.map((movie) => ({
          key: `film-${movie.id}`,
          aspect: POSTER_ASPECT,
          label: `${movie.title}${movie.year ? `, ${movie.year}` : ''}. Open film.`,
          caption: caption(movie),
          content: (
            <FilmArt movie={movie} />
          ),
        })),
      ]),
    [rooms],
  );

  return (
    <main className="gs-root">
      <ReelHeader reward={reward} search={search} onSearch={setSearch} />

      <div className="gs-toggle" role="group" aria-label="Choose how to browse">
        <button type="button" aria-pressed="true">
          Gallery
        </button>
        <button type="button" aria-pressed="false" onClick={() => navigate('/app/movies/list')}>
          List
        </button>
      </div>

      {genre ? (
        <p className="gs-filter">
          Showing {genre}
          <button type="button" onClick={() => setParams({})} aria-label={`Clear the ${genre} filter`}>
            Clear
          </button>
        </p>
      ) : null}

      <section className="gs-gallery" aria-label="Movie gallery">
        {error ? (
          <p className="gs-empty" style={{ paddingTop: 140 }}>
            {error}{' '}
            <button type="button" className="gs-more" onClick={() => void load()}>
              Try again
            </button>
          </p>
        ) : !payload ? (
          <p className="gs-empty" style={{ paddingTop: 140 }}>
            Hanging the posters…
          </p>
        ) : items.length === 0 ? (
          <p className="gs-empty" style={{ paddingTop: 140 }}>
            No films match. <Link to="/app/movies">Show everything</Link>
          </p>
        ) : (
          <GalleryWall
            items={items}
            storageKey={`studyreel.wall.${genre ?? 'all'}`}
            hint="Scroll or drag to walk the screening room · Click a poster to open it"
            onOpen={(item) => navigate(`/app/movies/${encodeURIComponent(item.key.replace(/^film-/, ''))}`)}
          />
        )}
      </section>

      <ScheduleAlerts />
    </main>
  );
}
