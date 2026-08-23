import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { Movie, MovieDecision, MovieSourceStatus, RewardSession } from '../lib/types';
import { clockFromSeconds } from '../lib/format';
import { Badge, Callout, EmptyState, LinkButton, PageHeader, Skeleton, TextInput } from '../components/ui';
import { Icon } from '../components/Icon';
import { MovieCard } from '../components/MovieCard';

interface MoviesPayload {
  movies: Movie[];
  top: Movie[];
  genres: string[];
  sources: MovieSourceStatus[];
  fromCache: boolean;
}

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
  const topFive = useMemo(() => (payload && unfiltered ? payload.top.slice(0, 5) : []), [payload, unfiltered]);

  const visible = useMemo(() => {
    if (!payload) return [];
    const needle = search.trim().toLowerCase();
    // Titles shown in the top rail are not repeated in the grid below it.
    const promoted = new Set(topFive.map((movie) => movie.id));
    return payload.movies.filter((movie) => {
      if (promoted.has(movie.id)) return false;
      if (genre !== 'ALL' && !movie.genres.includes(genre)) return false;
      if (!needle) return true;
      return (
        movie.title.toLowerCase().includes(needle) || movie.synopsis.toLowerCase().includes(needle)
      );
    });
  }, [payload, search, genre, topFive]);

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
        return { ...current, movies: next, top: next.slice(0, 10) };
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

  return (
    <>
      <PageHeader
        eyebrow="Free-to-watch catalog"
        title="Movies"
        description="Titles are aggregated from public-domain and freely redistributable collections. Save what you want for later, or decline it and it stops appearing here."
        actions={<LinkButton to="/app/watchlist" variant="secondary" icon="bookmark">Watch later</LinkButton>}
      />

      {watching && reward ? (
        <div className="panel mb-6 border-violet-500/40 bg-violet-500/[0.07] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge tone="border-violet-500/40 bg-violet-500/15 text-violet-200" icon="play">
                Session in progress
              </Badge>
              <p className="mt-2.5 font-semibold text-white">{reward.movie?.title}</p>
              <p className="mt-0.5 text-sm text-slate-400">
                {clockFromSeconds(reward.secondsRemaining)} remaining of {reward.minutesGranted} minutes.
              </p>
            </div>
            <LinkButton to={`/app/watch/${reward.id}`} icon="play">
              Resume session
            </LinkButton>
          </div>
        </div>
      ) : canStart && reward ? (
        <div className="panel mb-6 border-emerald-500/35 bg-emerald-500/[0.06] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-300" icon="check-circle">
                {reward.minutesGranted} minutes earned
              </Badge>
              <p className="mt-2.5 text-sm leading-6 text-slate-300">
                You cleared “{reward.chapterTitle}”. Choose a film below to start the clock — it closes
                itself when the time runs out, and the next chapter unlocks straight after.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel mb-6 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-800 text-slate-400">
              <Icon name="lock" size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200">No viewing time available right now</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Pass a chapter exam to earn a session. You can still browse and save titles for later.
              </p>
            </div>
            <LinkButton to="/app" variant="secondary" size="sm" iconAfter="arrow-right">
              Continue studying
            </LinkButton>
          </div>
        </div>
      )}

      {error ? (
        <div className="mb-5">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      {payload ? <SourceStrip sources={payload.sources} fromCache={payload.fromCache} /> : null}

      <div className="panel mb-7 mt-5 flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
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
        <select
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
          aria-label="Filter by genre"
          className="input h-10 w-full py-0 sm:w-52"
        >
          <option value="ALL">All genres</option>
          {(payload?.genres ?? []).map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </div>

      {!payload ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="h-80" />
          ))}
        </div>
      ) : (
        <>
          {topFive.length > 0 ? (
            <section className="mb-10">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Icon name="chart" size={17} className="text-brand-400" />
                Top titles right now
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {topFive.map((movie, index) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    rank={index + 1}
                    busy={busyId === movie.id}
                    onPlay={canStart ? startSession : undefined}
                    onSave={(entry) => void decide(entry, 'WATCH_LATER')}
                    onDecline={(entry) => void decide(entry, 'DECLINED')}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              {unfiltered ? 'More in the catalog' : `${visible.length} matching titles`}
            </h2>

            {visible.length === 0 ? (
              <EmptyState
                icon="search"
                title="No titles match"
                description="Try a different search term or genre."
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visible.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    busy={busyId === movie.id}
                    onPlay={canStart ? startSession : undefined}
                    onSave={(entry) => void decide(entry, 'WATCH_LATER')}
                    onDecline={(entry) => void decide(entry, 'DECLINED')}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function SourceStrip({ sources, fromCache }: { sources: MovieSourceStatus[]; fromCache: boolean }) {
  const TONE: Record<MovieSourceStatus['status'], string> = {
    ok: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    unavailable: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    disabled: 'border-ink-600 bg-ink-800/60 text-slate-500',
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-500">Sources:</span>
      {sources.map((source) => (
        <span
          key={source.name}
          title={source.detail}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${TONE[source.status]}`}
        >
          {source.name}
          {source.status === 'ok' ? ` · ${source.count}` : ` · ${source.status}`}
        </span>
      ))}
      {fromCache ? <span className="text-slate-600">served from cache</span> : null}
    </div>
  );
}
