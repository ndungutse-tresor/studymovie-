import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { Movie, RewardSession } from '../lib/types';
import { clockFromSeconds, posterGradient } from '../lib/format';
import { Badge, Button, Callout, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';

/**
 * The timed player.
 *
 * The countdown shown here is cosmetic. The authoritative expiry lives on the
 * server, and this view re-checks it every 15 seconds; when the session has
 * elapsed the player is torn down and the next chapter is offered. Reloading or
 * reopening the page cannot extend the entitlement.
 */
const SYNC_INTERVAL_MS = 15_000;

export default function Watch() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<RewardSession | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const concludedRef = useRef(false);

  const sync = useCallback(async () => {
    try {
      const payload = await api.get<{ session: RewardSession }>(`/rewards/${sessionId}`);
      setSession(payload.session);
      setSecondsLeft(payload.session.secondsRemaining);
      if (payload.session.concluded) concludedRef.current = true;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'This viewing session could not be loaded.');
    }
  }, [sessionId]);

  useEffect(() => {
    void sync();
  }, [sync]);

  // Resolve richer artwork and the embed URL for the pinned title.
  useEffect(() => {
    if (!session?.movie) return;
    let cancelled = false;
    api
      .get<{ movies: Movie[] }>('/movies?limit=100')
      .then((payload) => {
        if (cancelled) return;
        setMovie(payload.movies.find((entry) => entry.id === session.movie?.id) ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session?.movie?.id, session?.movie]);

  // Local ticker for display, plus a hard stop when it reaches zero.
  useEffect(() => {
    if (!session || session.concluded) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          void sync();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session, sync]);

  // Periodic reconciliation with the server clock.
  useEffect(() => {
    if (!session || session.concluded) return;
    const timer = window.setInterval(() => void sync(), SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [session, sync]);

  async function endSession() {
    setEnding(true);
    try {
      const payload = await api.post<{ session: RewardSession }>(`/rewards/${sessionId}/end`);
      setSession(payload.session);
      setSecondsLeft(0);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The session could not be closed.');
    } finally {
      setEnding(false);
    }
  }

  if (error && !session) return <Callout tone="danger">{error}</Callout>;

  if (!session) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="aspect-video w-full" />
      </div>
    );
  }

  if (session.concluded) {
    return <SessionEnded session={session} onNext={() => navigate(`/app/study/${session.nextChapterId}`)} />;
  }

  const urgent = secondsLeft <= 120;
  const elapsedPercent = session.minutesGranted
    ? 100 - (secondsLeft / (session.minutesGranted * 60)) * 100
    : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Badge tone="border-violet-500/40 bg-violet-500/15 text-violet-200" icon="play">
            Earned viewing session
          </Badge>
          <h1 className="mt-3 truncate text-2xl font-bold tracking-tight text-white">
            {session.movie?.title ?? 'Your session'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Earned by passing “{session.chapterTitle}” in {session.courseTitle}.
          </p>
        </div>

        <div
          className={`rounded-xl border px-5 py-3 text-center ${
            urgent ? 'border-rose-500/45 bg-rose-500/10' : 'border-ink-600 bg-ink-900/70'
          }`}
        >
          <p className="text-[0.65rem] uppercase tracking-wider text-slate-500">Session closes in</p>
          <p
            className={`mt-0.5 font-mono text-2xl font-bold tabular-nums ${
              urgent ? 'animate-progress-pulse text-rose-300' : 'text-white'
            }`}
          >
            {clockFromSeconds(secondsLeft)}
          </p>
        </div>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-ink-800">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ${urgent ? 'bg-rose-500' : 'bg-violet-500'}`}
          style={{ width: `${Math.min(100, Math.max(0, elapsedPercent))}%` }}
        />
      </div>

      <div className="panel mt-5 overflow-hidden">
        <Player movie={movie} session={session} />
      </div>

      {error ? (
        <div className="mt-5">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      <div className="panel mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200">
            The player closes itself when the timer reaches zero
          </p>
          <p className="mt-1 text-sm text-slate-500">
            The next chapter unlocks the moment this session ends — whether it runs out or you end it early.
            Time you do not use is not carried over.
          </p>
        </div>
        <Button variant="secondary" icon="stop" loading={ending} onClick={() => void endSession()}>
          End session now
        </Button>
      </div>
    </div>
  );
}

function Player({ movie, session }: { movie: Movie | null; session: RewardSession }) {
  const embedUrl = movie?.embedUrl ?? null;
  const streamUrl = movie?.streamUrl ?? session.movie?.streamUrl ?? null;
  const title = session.movie?.title ?? movie?.title ?? 'Your film';

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={title}
        allow="fullscreen; autoplay; encrypted-media"
        allowFullScreen
        className="aspect-video w-full border-0 bg-black"
      />
    );
  }

  if (streamUrl) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={streamUrl} controls autoPlay className="aspect-video w-full bg-black" />
    );
  }

  return (
    <div
      className="flex aspect-video w-full flex-col items-center justify-center gap-4 p-8 text-center"
      style={{ backgroundImage: posterGradient(title) }}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/35 text-white/80">
        <Icon name="film" size={26} />
      </span>
      <div>
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/70">
          No playable stream could be resolved for this title from here. Your session clock is still
          running, and the next chapter unlocks when it ends.
        </p>
      </div>
      {movie?.sourceUrl ? (
        <a
          href={movie.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/12 px-4 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Open at the source
          <Icon name="external" size={14} />
        </a>
      ) : null}
    </div>
  );
}

function SessionEnded({ session, onNext }: { session: RewardSession; onNext: () => void }) {
  const expired = session.status === 'EXPIRED';

  return (
    <div className="mx-auto max-w-2xl">
      <div className="panel p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
          <Icon name={expired ? 'clock' : 'check-circle'} size={28} />
        </span>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
          {expired ? 'Your viewing time is up' : 'Session closed'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
          {session.courseCompleted
            ? `You have finished every chapter in ${session.courseTitle}. Pick another course when you are ready.`
            : session.nextChapterId
              ? 'The next chapter is now unlocked. Study it, clear the exam, and you earn the next session.'
              : 'This chapter is complete.'}
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {session.nextChapterId ? (
            <Button size="lg" onClick={onNext} iconAfter="arrow-right">
              Start the next chapter
            </Button>
          ) : null}
          <a
            href="/app"
            className="inline-flex h-12 items-center rounded-lg border border-ink-600 px-5 text-sm font-medium text-slate-200 transition hover:border-ink-500"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
