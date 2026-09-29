import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { Movie, MovieDecision, MovieSourceStatus, RewardSession } from '../lib/types';
import { clockFromSeconds } from '../lib/format';
import { Button, Callout, EmptyState, LinkButton, PageHeader, Skeleton, TextInput } from '../components/ui';
import { Icon } from '../components/Icon';
import { MovieCard } from '../components/MovieCard';
import { Poster } from '../components/Poster';

interface MoviesPayload {
  movies: Movie[];
  top: Movie[];
  genres: string[];
  sources: MovieSourceStatus[];
  fromCache: boolean;
}

const RAIL_SIZE = 10;

export default function Movies() {
  const navigate = useNavigate();

  const [payload, setPayload] = useState<MoviesPayload | null>(null);
  const [reward, setReward] = useState<RewardSession | null>(null);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('ALL');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const unfiltered = search.trim() === '' && genre === 'ALL';
  const rail = useMemo(() => (payload && unfiltered ? payload.top.slice(0, RAIL_SIZE) : []), [payload, unfiltered]);
  const featured = rail[0] ?? null;

  const visible = useMemo(() => {
    if (!payload) return [];
    const needle = search.trim().toLowerCase();
    // Titles shown in the top rail are not repeated in the grid below it.
    const promoted = new Set(rail.map((movie) => movie.id));
    return payload.movies.filter((movie) => {
      if (promoted.has(movie.id)) return false;
      if (genre !== 'ALL' && !movie.genres.includes(genre)) return false;
      if (!needle) return true;
      return movie.title.toLowerCase().includes(needle) || movie.synopsis.toLowerCase().includes(needle);
    });
  }, [payload, search, genre, rail]);

  async function decide(movie: Movie, decision: MovieDecision) {
    setBusyId(movie.id);
    setError(null);
    try {
      await api.post(`/movies/${encodeURIComponent(movie.id)}/decision`, { decision });
      setPayload((current) => {
        if (!current) return current;
        const next =
          decision === 'DECLINED'
            ? current.movies.filter((entry) => entry.id !== movie.id)
            : current.movies.map((entry) => (entry.id === movie.id ? { ...entry, decision } : entry));
        return { ...current, movies: next, top: next.slice(0, RAIL_SIZE) };
      });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That action could not be saved.');
    } finally {
      setBusyId(null);
    }
  }

  async function startSession(movie: Movie) {
    if (!reward) return;
    setBusyId(movie.id);
    setError(null);
    try {
      await api.post(`/rewards/${reward.id}/start`, { movieId: movie.id });
      navigate(`/app/watch/${reward.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The viewing session could not be started.');
      setBusyId(null);
    }
  }

  const canStart = reward?.status === 'GRANTED';
  const watching = reward?.status === 'ACTIVE';
  const cardHandlers = {
    onPlay: canStart ? startSession : undefined,
    onSave: (entry: Movie) => void decide(entry, 'WATCH_LATER'),
    onDecline: (entry: Movie) => void decide(entry, 'DECLINED'),
  };

  return (
    <>
      <PageHeader
        eyebrow="Free-to-watch catalog"
        title="Movies"
        description="Public-domain and freely redistributable films. Save what you want for later, or decline it and it stops appearing here."
        actions={
          <LinkButton to="/app/watchlist" variant="secondary" icon="bookmark">
            Watch later
          </LinkButton>
        }
      />

      <RewardBanner reward={reward} canStart={canStart} watching={watching} />

      {error ? (
        <div className="mb-6">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      {!payload ? (
        <div className="space-y-8">
          <Skeleton className="h-72" />
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[2/3]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {featured ? (
            <FeaturedFilm
              movie={featured}
              busy={busyId === featured.id}
              canStart={canStart}
              onPlay={() => void startSession(featured)}
              onSave={() => void decide(featured, 'WATCH_LATER')}
              onDecline={() => void decide(featured, 'DECLINED')}
            />
          ) : null}

          {rail.length > 0 ? (
            <section className="mb-12">
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2 className="section-title">Top {rail.length} right now</h2>
                <p className="hidden text-xs text-slate-500 sm:block">Ranked by popularity across sources</p>
              </div>
              <div className="no-scrollbar -mx-4 flex scroll-px-4 snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-10 lg:scroll-px-10 lg:px-10">
                {rail.map((movie, index) => (
                  <div key={movie.id} className="w-40 shrink-0 snap-start sm:w-44">
                    <MovieCard movie={movie} rank={index + 1} busy={busyId === movie.id} {...cardHandlers} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="section-title">
                {unfiltered ? 'More in the catalog' : `${visible.length} matching ${visible.length === 1 ? 'title' : 'titles'}`}
              </h2>
              <div className="relative lg:w-72">
                <Icon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <TextInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search titles"
                  className="pl-10"
                  aria-label="Search films"
                />
              </div>
            </div>

            <div className="no-scrollbar -mx-4 mb-7 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by genre">
              {['ALL', ...payload.genres].map((entry) => {
                const active = genre === entry;
                return (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setGenre(entry)}
                    aria-pressed={active}
                    className={`h-8 shrink-0 rounded-full border px-3.5 text-xs font-medium transition ${
                      active
                        ? 'border-white bg-white text-ink-950'
                        : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-100'
                    }`}
                  >
                    {entry === 'ALL' ? 'All genres' : entry}
                  </button>
                );
              })}
            </div>

            {visible.length === 0 ? (
              <EmptyState icon="search" title="No titles match" description="Try a different search term or genre." />
            ) : (
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visible.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} busy={busyId === movie.id} {...cardHandlers} />
                ))}
              </div>
            )}
          </section>

          <SourceStrip sources={payload.sources} fromCache={payload.fromCache} />
        </>
      )}
    </>
  );
}

function RewardBanner({
  reward,
  canStart,
  watching,
}: {
  reward: RewardSession | null;
  canStart: boolean;
  watching: boolean;
}) {
  if (watching && reward) {
    return (
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-reel-400/30 bg-gradient-to-r from-reel-400/[0.1] to-transparent p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-reel-400/15 text-reel-200">
            <Icon name="play" size={16} />
          </span>
          <div>
            <p className="font-semibold text-white">{reward.movie?.title} is playing</p>
            <p className="mt-0.5 text-sm text-slate-400">
              {clockFromSeconds(reward.secondsRemaining)} remaining of {reward.minutesGranted} minutes.
            </p>
          </div>
        </div>
        <LinkButton to={`/app/watch/${reward.id}`} variant="reel" icon="play">
          Resume session
        </LinkButton>
      </div>
    );
  }

  if (canStart && reward) {
    return (
      <div className="mb-8 flex items-center gap-4 rounded-xl border border-reel-400/30 bg-gradient-to-r from-reel-400/[0.1] to-transparent p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-reel-400/15 text-reel-200">
          <Icon name="ticket" size={19} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-white">You have {reward.minutesGranted} minutes to spend</p>
          <p className="mt-0.5 text-sm leading-6 text-slate-400">
            Earned by clearing “{reward.chapterTitle}”. Press <span className="font-medium text-reel-200">Watch</span> on
            any film to start the clock — it closes itself when the time runs out.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.07] bg-ink-900 p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-slate-400">
        <Icon name="lock" size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-100">No viewing time available right now</p>
        <p className="mt-0.5 text-sm text-slate-500">
          Pass a chapter exam to earn a session. You can still browse and save titles for later.
        </p>
      </div>
      <LinkButton to="/app" variant="secondary" size="sm" iconAfter="arrow-right">
        Continue studying
      </LinkButton>
    </div>
  );
}

function FeaturedFilm({
  movie,
  busy,
  canStart,
  onPlay,
  onSave,
  onDecline,
}: {
  movie: Movie;
  busy: boolean;
  canStart: boolean;
  onPlay: () => void;
  onSave: () => void;
  onDecline: () => void;
}) {
  const saved = movie.decision === 'WATCH_LATER';

  return (
    <section className="relative isolate mb-12 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900">
      <Poster
        title={movie.title}
        posterUrl={movie.posterUrl}
        size="lg"
        className="absolute inset-0 -z-20 scale-125 opacity-60 blur-3xl"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/40" />

      <div className="flex flex-col gap-8 p-6 sm:flex-row sm:items-center sm:p-10">
        <Poster
          title={movie.title}
          year={movie.year}
          genre={movie.genres[0]}
          posterUrl={movie.posterUrl}
          size="md"
          className="aspect-[2/3] w-36 shrink-0 rounded-lg shadow-lift ring-1 ring-white/15 sm:w-48"
        />

        <div className="min-w-0 max-w-xl">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-reel-300">
            <Icon name="award" size={14} />
            Top ranked title
          </p>
          <h2 className="mt-3 font-display text-4xl leading-none text-white sm:text-5xl">{movie.title}</h2>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
            {movie.year ? <span>{movie.year}</span> : null}
            {movie.runtimeMinutes ? <span>· {movie.runtimeMinutes} min</span> : null}
            {movie.genres.length ? <span>· {movie.genres.slice(0, 2).join(', ')}</span> : null}
            {movie.rating !== null ? (
              <span className="flex items-center gap-1 text-reel-300">
                · <Icon name="star" size={12} filled /> {movie.rating.toFixed(1)}
              </span>
            ) : null}
          </p>
          <p className="mt-4 text-[0.9375rem] leading-7 text-slate-300">{movie.synopsis}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            {canStart ? (
              <Button variant="reel" size="lg" icon="play" loading={busy} onClick={onPlay}>
                Watch now
              </Button>
            ) : null}
            <Button
              variant={canStart ? 'secondary' : 'light'}
              size="lg"
              icon="bookmark"
              disabled={busy || saved}
              onClick={onSave}
            >
              {saved ? 'Saved for later' : 'Save for later'}
            </Button>
            <Button variant="ghost" size="lg" icon="close" disabled={busy} onClick={onDecline}>
              Not interested
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SourceStrip({ sources, fromCache }: { sources: MovieSourceStatus[]; fromCache: boolean }) {
  const DOT: Record<MovieSourceStatus['status'], string> = {
    ok: 'bg-emerald-400',
    unavailable: 'bg-amber-400',
    disabled: 'bg-slate-600',
  };

  return (
    <footer className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-6 text-xs text-slate-500">
      <span className="font-medium text-slate-400">Sources</span>
      {sources.map((source) => (
        <span key={source.name} title={source.detail} className="inline-flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${DOT[source.status]}`} />
          {source.name}
          <span className="text-slate-600">{source.status === 'ok' ? source.count : source.status}</span>
        </span>
      ))}
      {fromCache ? <span className="text-slate-600">· served from cache</span> : null}
      <span className="basis-full text-slate-600 sm:ml-auto sm:basis-auto">
        Playable streams resolve from the Internet Archive when it is reachable.
      </span>
    </footer>
  );
}
