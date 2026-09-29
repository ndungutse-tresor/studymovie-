import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { Movie, RewardSession } from '../lib/types';
import { clockFromSeconds } from '../lib/format';
import { Button, Callout, ProgressRing, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';
import { Poster } from '../components/Poster';

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
  const total = session.minutesGranted * 60;
  const remainingPercent = total ? (secondsLeft / total) * 100 : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-reel-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-reel-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-reel-400" />
            </span>
            Earned viewing session
          </p>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {session.movie?.title ?? 'Your session'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Earned by passing “{session.chapterTitle}” in {session.courseTitle}.
          </p>
        </div>

        <div
          className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${
            urgent ? 'border-rose-400/40 bg-rose-500/10' : 'border-white/10 bg-ink-900'
          }`}
        >
          <ProgressRing
            value={remainingPercent}
            size={44}
            stroke={4}
            tone={urgent ? 'text-rose-400' : 'text-reel-400'}
          >
            <Icon name="clock" size={15} className={urgent ? 'text-rose-300' : 'text-slate-400'} />
          </ProgressRing>
          <div>
            <p className="text-2xs uppercase tracking-wider text-slate-500">Session closes in</p>
            <p
              className={`font-mono text-2xl font-semibold tabular-nums ${
                urgent ? 'animate-progress-pulse text-rose-200' : 'text-white'
              }`}
            >
              {clockFromSeconds(secondsLeft)}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-black shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
        <Player movie={movie} session={session} />
        <div className="h-1 w-full bg-white/[0.06]">
          <div
            className={`h-full transition-[width] duration-1000 ${urgent ? 'bg-rose-500' : 'bg-reel-400'}`}
            style={{ width: `${Math.min(100, Math.max(0, 100 - remainingPercent))}%` }}
          />
        </div>
      </div>

      {error ? (
        <div className="mt-5">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex gap-3.5">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-slate-500" />
          <p className="text-sm leading-6 text-slate-400">
            <span className="font-medium text-slate-200">The player closes itself when the timer reaches zero.</span>{' '}
            The next chapter unlocks the moment this session ends — whether it runs out or you end it early. Time you
            do not use is not carried over.
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
    <div className="relative isolate flex aspect-video w-full items-center justify-center overflow-hidden">
      <Poster
        title={title}
        posterUrl={movie?.posterUrl ?? session.movie?.posterUrl}
        size="lg"
        className="absolute inset-0 -z-10 scale-110 opacity-50 blur-2xl"
      />
      <div className="absolute inset-0 -z-10 bg-black/50" />
      <div className="flex max-w-2xl flex-col items-center gap-6 p-6 text-center sm:flex-row sm:text-left">
        <Poster
          title={title}
          year={movie?.year}
          genre={movie?.genres[0]}
          posterUrl={movie?.posterUrl ?? session.movie?.posterUrl}
          size="sm"
          className="hidden aspect-[2/3] w-36 shrink-0 rounded-lg shadow-lift ring-1 ring-white/15 sm:block"
        />
        <div>
          <p className="text-lg font-semibold text-white">{title}</p>
          <p className="mt-2 text-sm leading-6 text-white/70">
            No playable stream could be resolved for this title from here. Your session clock is still running, and
            the next chapter unlocks when it ends.
          </p>
          {movie?.sourceUrl ? (
            <a
              href={movie.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-ink-950 transition hover:bg-slate-200"
            >
              Open at the source
              <Icon name="external" size={14} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SessionEnded({ session, onNext }: { session: RewardSession; onNext: () => void }) {
  const expired = session.status === 'EXPIRED';

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="panel relative isolate overflow-hidden p-8 text-center sm:p-10">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-48 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/20 blur-3xl" />
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/15 text-brand-200 ring-1 ring-inset ring-brand-400/30">
          <Icon name={session.courseCompleted ? 'award' : expired ? 'clock' : 'check'} size={24} />
        </span>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white">
          {session.courseCompleted ? 'Course complete' : expired ? 'Your viewing time is up' : 'Session closed'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
          {session.courseCompleted
            ? `You have finished every chapter in ${session.courseTitle}. Pick another course when you are ready.`
            : session.nextChapterId
              ? 'The next chapter is now unlocked. Study it, clear the exam, and you earn the next session.'
              : 'This chapter is complete.'}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {session.nextChapterId ? (
            <Button size="lg" onClick={onNext} iconAfter="arrow-right">
              Start the next chapter
            </Button>
          ) : null}
          <Link
            to="/app"
            className="inline-flex h-11 items-center rounded-lg border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
