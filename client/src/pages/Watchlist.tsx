import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../lib/api';
import type { Movie, MovieDecision, RewardSession } from '../lib/types';
import { Badge, Callout, EmptyState, LinkButton, PageHeader, Skeleton } from '../components/ui';
import { MovieCard } from '../components/MovieCard';
import { useNavigate } from 'react-router-dom';

interface ListItem {
  movieId: string;
  decision: MovieDecision;
  title: string;
  posterUrl: string | null;
  source: string | null;
  year: number | null;
  decidedAt: string | null;
  movie: Movie | null;
}

const TABS: { value: MovieDecision; label: string; empty: string }[] = [
  {
    value: 'WATCH_LATER',
    label: 'Watch later',
    empty: 'Nothing saved yet. Browse the catalog and save titles for a future session.',
  },
  {
    value: 'DECLINED',
    label: 'Declined',
    empty: 'You have not declined any titles. Declined films stop appearing in recommendations.',
  },
  { value: 'WATCHED', label: 'Watched', empty: 'Films you watch during a session appear here.' },
];

export default function Watchlist() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<MovieDecision>('WATCH_LATER');
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [reward, setReward] = useState<RewardSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    try {
      const [list, active] = await Promise.all([
        api.get<{ items: ListItem[] }>(`/movies/list?decision=${tab}`),
        api.get<{ session: RewardSession | null }>('/rewards/active'),
      ]);
      setItems(list.items);
      setReward(active.session);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Your list could not be loaded.');
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(movieId: string) {
    setBusyId(movieId);
    try {
      await api.delete(`/movies/${encodeURIComponent(movieId)}/decision`);
      setItems((current) => current?.filter((item) => item.movieId !== movieId) ?? null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That title could not be removed.');
    } finally {
      setBusyId(null);
    }
  }

  async function startSession(movie: Movie) {
    if (!reward || reward.status !== 'GRANTED') return;
    setBusyId(movie.id);
    try {
      await api.post(`/rewards/${reward.id}/start`, { movieId: movie.id });
      navigate(`/app/watch/${reward.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The session could not be started.');
      setBusyId(null);
    }
  }

  const active = TABS.find((entry) => entry.value === tab)!;
  const canStart = reward?.status === 'GRANTED';

  return (
    <>
      <PageHeader
        eyebrow="Your list"
        title="Watch later"
        description="Titles you saved for a future session, plus the ones you declined and the ones you have already watched."
        actions={<LinkButton to="/app/movies" variant="secondary" icon="film">Browse films</LinkButton>}
      />

      {canStart ? (
        <div className="panel mb-6 border-emerald-500/35 bg-emerald-500/[0.06] p-4">
          <Badge tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-300" icon="check-circle">
            {reward!.minutesGranted} minutes of viewing time available
          </Badge>
          <p className="mt-2 text-sm text-slate-400">
            Pick anything from your saved list to start the session.
          </p>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setTab(entry.value)}
            className={`h-9 rounded-lg border px-4 text-sm font-medium transition ${
              tab === entry.value
                ? 'border-brand-500/50 bg-brand-500/15 text-brand-100'
                : 'border-ink-600 text-slate-400 hover:border-ink-500 hover:text-slate-200'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-5">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      {!items ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-80" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title={`Nothing in ${active.label.toLowerCase()}`}
          description={active.empty}
          action={<LinkButton to="/app/movies">Browse films</LinkButton>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) =>
            item.movie ? (
              <MovieCard
                key={item.movieId}
                movie={{ ...item.movie, decision: item.decision }}
                busy={busyId === item.movieId}
                onPlay={canStart && tab !== 'DECLINED' ? startSession : undefined}
                onUndo={() => void remove(item.movieId)}
              />
            ) : (
              <article key={item.movieId} className="panel flex flex-col justify-between p-4">
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  {item.year ? <p className="mt-1 text-xs text-slate-500">{item.year}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => void remove(item.movieId)}
                  className="mt-4 h-8 rounded-lg border border-ink-600 text-xs font-medium text-slate-300 transition hover:border-ink-500"
                >
                  Remove
                </button>
              </article>
            ),
          )}
        </div>
      )}
    </>
  );
}
