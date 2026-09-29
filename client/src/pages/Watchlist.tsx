import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../lib/api';
import type { Movie, MovieDecision, RewardSession } from '../lib/types';
import { Callout, EmptyState, LinkButton, PageHeader, SegmentedControl, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';
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
        <div className="mb-8 flex items-center gap-4 rounded-xl border border-reel-400/30 bg-gradient-to-r from-reel-400/[0.1] to-transparent p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-reel-400/15 text-reel-200">
            <Icon name="ticket" size={19} />
          </span>
          <div>
            <p className="font-semibold text-white">{reward!.minutesGranted} minutes of viewing time available</p>
            <p className="mt-0.5 text-sm text-slate-400">Pick anything from your saved list to start the session.</p>
          </div>
        </div>
      ) : null}

      <div className="mb-8">
        <SegmentedControl
          label="Lists"
          options={TABS.map((entry) => ({ value: entry.value, label: entry.label }))}
          value={tab}
          onChange={setTab}
        />
      </div>

      {error ? (
        <div className="mb-5">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      {!items ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[2/3]" />
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
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                  className="mt-4 h-8 rounded-lg border border-white/10 text-xs font-medium text-slate-300 transition hover:border-white/20"
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
