import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { Movie, MovieDecision, RewardSession } from '../lib/types';
import { clockFromSeconds } from '../lib/format';
import { ReelHeader } from '../components/gallery/ReelHeader';
import { FilmArt } from '../components/gallery/FilmArt';
import { ScheduleAlerts } from '../components/ScheduleAlerts';
import '../components/gallery/gallery.css';

const SOURCE_LABEL: Record<Movie['source'], string> = {
  archive: 'Internet Archive',
  youtube: 'YouTube',
  tmdb: 'TMDB',
  catalog: 'StudyReel catalog',
  manual: 'StudyReel library',
};

/** One film, laid out like a print in a gallery shop: poster on the left, choices on the right. */
export default function FilmPage() {
  const { movieId = '' } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [reward, setReward] = useState<RewardSession | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [film, active] = await Promise.all([
        api.get<{ movie: Movie }>(`/movies/${encodeURIComponent(movieId)}`),
        api.get<{ session: RewardSession | null }>('/rewards/active'),
      ]);
      setMovie(film.movie);
      setReward(active.session);
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'This film could not be loaded.');
    }
  }, [movieId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Lets the gallery's flying poster know the page image is in place.
  useEffect(() => {
    if (movie) window.dispatchEvent(new Event('gs:arrived'));
  }, [movie]);

  async function decide(decision: MovieDecision | null) {
    if (!movie) return;
    setBusy(true);
    setError(null);
    try {
      if (decision) await api.post(`/movies/${encodeURIComponent(movie.id)}/decision`, { decision });
      else await api.delete(`/movies/${encodeURIComponent(movie.id)}/decision`);
      setMovie({ ...movie, decision });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That choice could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function watch() {
    if (!movie || reward?.status !== 'GRANTED') return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/rewards/${reward.id}/start`, { movieId: movie.id });
      navigate(`/app/watch/${reward.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The viewing session could not be started.');
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <main className="gs-root">
        <ReelHeader reward={reward} />
        <p className="gs-empty" style={{ paddingTop: 160 }}>
          {loadError} <Link to="/app/movies">Back to the gallery</Link>
        </p>
      </main>
    );
  }

  if (!movie) {
    return (
      <main className="gs-root">
        <ReelHeader reward={reward} />
        <p className="gs-empty" style={{ paddingTop: 160 }}>
          Loading…
        </p>
      </main>
    );
  }

  const genre = movie.genres[0] ?? 'Feature film';
  const saved = movie.decision === 'WATCH_LATER';
  const declined = movie.decision === 'DECLINED';
  const playingThis = reward?.status === 'ACTIVE' && reward.movie?.id === movie.id;
  const playingOther = reward?.status === 'ACTIVE' && !playingThis;
  const synopsis = movie.synopsis || 'A freely licensed film from the StudyReel catalog.';
  const short = synopsis.length > 230 && !expanded ? `${synopsis.slice(0, 220).replace(/\s+\S*$/, '')} …` : synopsis;
  const details = [
    movie.year ? String(movie.year) : null,
    movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : null,
    movie.rating !== null ? `★ ${movie.rating.toFixed(1)}` : null,
  ].filter(Boolean) as string[];

  let price: React.ReactNode;
  let badge: string;
  if (reward?.status === 'GRANTED') {
    price = (
      <>
        {reward.minutesGranted} min<small>of viewing time earned</small>
      </>
    );
    badge = `Earned by clearing “${reward.chapterTitle}”`;
  } else if (reward?.status === 'ACTIVE') {
    price = (
      <>
        {clockFromSeconds(reward.secondsRemaining)}
        <small>left in your session</small>
      </>
    );
    badge = playingThis ? 'This film is playing now' : `Now playing: ${reward.movie?.title ?? 'another film'}`;
  } else {
    price = (
      <>
        Locked<small>pass a chapter exam to earn time</small>
      </>
    );
    badge = 'Save it now, watch it after your next exam';
  }

  return (
    <main className="gs-root">
      <ReelHeader reward={reward} />
      <article className="gs-product">
        <div className="gs-media">
          <span className="gs-media-frame" style={{ aspectRatio: '2 / 3' }}>
            <FilmArt movie={movie} />
          </span>
          <div className="gs-media-bar">
            <span>1/1</span>
            {movie.sourceUrl ? (
              <a className="gs-media-action" href={movie.sourceUrl} target="_blank" rel="noreferrer">
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6.5 5v6L11 8 6.5 5Z" fill="currentColor" />
                </svg>
                View at the source
              </a>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="gs-media-action"
              aria-pressed={saved}
              aria-label={saved ? 'Saved for later. Remove from Watch later.' : 'Save for later'}
              title={saved ? 'Saved for later' : 'Save for later'}
              disabled={busy}
              onClick={() => void decide(saved ? null : 'WATCH_LATER')}
            >
              <svg width="12" height="15" viewBox="0 0 12 15" aria-hidden="true">
                <path d="M1 1h10v13l-5-3.6L1 14Z" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          </div>
        </div>

        <div className="gs-info">
          <p className="gs-crumb">
            <Link to="/app/movies">Movies</Link> / {genre}
          </p>
          <h1 className="gs-kicker">{genre}</h1>
          <h2 className="gs-title">{movie.title}</h2>
          {details.length ? <p className="gs-byline">{details.join(' · ')}</p> : null}
          <p className="gs-desc">
            {short}{' '}
            {synopsis.length > 230 ? (
              <button type="button" className="gs-more" onClick={() => setExpanded((value) => !value)}>
                {expanded ? 'Show less' : 'Read more »'}
              </button>
            ) : null}
          </p>

          <p className="gs-price">{price}</p>
          <p className="gs-badge">{badge}</p>

          <p className="gs-note">
            The clock starts when you press Watch and closes the session by itself when the minutes run out. However a
            session ends, your next chapter unlocks.
          </p>

          <div className="gs-options">
            <div className="gs-option">
              <p className="gs-option-label">
                List: <span>{saved ? 'Watch later' : declined ? 'Not interested' : 'Not saved'}</span>
              </p>
              <div className="gs-chips">
                <button
                  type="button"
                  className="gs-chip"
                  aria-pressed={saved}
                  disabled={busy}
                  onClick={() => void decide(saved ? null : 'WATCH_LATER')}
                >
                  Watch later
                </button>
                <button
                  type="button"
                  className="gs-chip"
                  aria-pressed={declined}
                  disabled={busy}
                  onClick={() => void decide(declined ? null : 'DECLINED')}
                >
                  Not interested
                </button>
              </div>
            </div>

            {movie.genres.length ? (
              <div className="gs-option">
                <p className="gs-option-label">
                  Genre: <span>{movie.genres.join(', ')}</span>
                </p>
                <div className="gs-chips">
                  {movie.genres.map((entry) => (
                    <Link key={entry} className="gs-chip" to={`/app/movies?genre=${encodeURIComponent(entry)}`}>
                      {entry}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="gs-option">
              <p className="gs-option-label">
                Source: <span>{movie.licence || 'Free to watch'}</span>
              </p>
              <div className="gs-chips">
                <span className="gs-chip is-selected is-info">{SOURCE_LABEL[movie.source] ?? movie.source}</span>
                {details.map((detail) => (
                  <span key={detail} className="gs-chip is-plain">
                    {detail}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="gs-buy">
            {reward?.status === 'GRANTED' ? (
              <button type="button" className="gs-cta" disabled={busy} onClick={() => void watch()}>
                {busy ? 'Starting…' : `Watch now · ${reward.minutesGranted} min`}
              </button>
            ) : playingThis ? (
              <Link className="gs-cta" to={`/app/watch/${reward!.id}`}>
                Resume session
              </Link>
            ) : playingOther ? (
              <Link className="gs-cta" to={`/app/watch/${reward!.id}`}>
                Back to the film that's playing
              </Link>
            ) : (
              <Link className="gs-cta" to="/app">
                Continue studying to unlock
              </Link>
            )}
          </div>

          {declined ? (
            <p className="gs-fine">This film no longer appears in your catalog. Choose Not interested again to undo.</p>
          ) : null}
          {error ? (
            <p className="gs-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </article>
      <ScheduleAlerts />
    </main>
  );
}
