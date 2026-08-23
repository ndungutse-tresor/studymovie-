import type { Movie, MovieDecision } from '../lib/types';
import { posterGradient } from '../lib/format';
import { Icon } from './Icon';

interface MovieCardProps {
  movie: Movie;
  rank?: number;
  busy?: boolean;
  /** Present when the learner currently holds unstarted viewing time. */
  onPlay?: (movie: Movie) => void;
  onSave?: (movie: Movie) => void;
  onDecline?: (movie: Movie) => void;
  onUndo?: (movie: Movie) => void;
}

const DECISION_LABEL: Record<MovieDecision, string> = {
  WATCH_LATER: 'Saved for later',
  DECLINED: 'Declined',
  WATCHED: 'Watched',
};

export function MovieCard({ movie, rank, busy, onPlay, onSave, onDecline, onUndo }: MovieCardProps) {
  const playable = Boolean(movie.embedUrl ?? movie.streamUrl);

  return (
    <article className="panel group flex flex-col overflow-hidden transition hover:border-brand-500/40">
      <div
        className="relative flex aspect-[2/3] items-end overflow-hidden"
        style={
          movie.posterUrl
            ? { backgroundImage: `url(${movie.posterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { backgroundImage: posterGradient(movie.title) }
        }
      >
        {!movie.posterUrl ? (
          <div className="flex h-full w-full items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white/70 ring-1 ring-inset ring-white/15">
              <Icon name="film" size={24} />
            </span>
            <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />
        )}

        {rank !== undefined ? (
          <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-ink-950/85 text-xs font-bold text-white backdrop-blur">
            {rank}
          </span>
        ) : null}

        {movie.rating !== null ? (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-ink-950/85 px-2 py-1 text-xs font-semibold text-amber-300 backdrop-blur">
            <Icon name="star" size={11} filled />
            {movie.rating.toFixed(1)}
          </span>
        ) : null}

        {movie.decision ? (
          <span
            className={`absolute bottom-3 left-3 rounded-md px-2 py-1 text-[0.65rem] font-semibold backdrop-blur ${
              movie.decision === 'DECLINED'
                ? 'bg-rose-500/85 text-white'
                : movie.decision === 'WATCHED'
                  ? 'bg-ink-950/85 text-slate-300'
                  : 'bg-brand-500/90 text-white'
            }`}
          >
            {DECISION_LABEL[movie.decision]}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold leading-snug text-white">{movie.title}</h3>
        <p className="mt-1 text-xs text-slate-500">
          {[movie.year, movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : null, movie.genres[0]]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="mt-2.5 line-clamp-3 flex-1 text-xs leading-5 text-slate-400">{movie.synopsis}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {onPlay ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onPlay(movie)}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
            >
              <Icon name="play" size={12} />
              Watch
            </button>
          ) : null}

          {onSave ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onSave(movie)}
              title="Save for later"
              aria-label={`Save ${movie.title} for later`}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-ink-600 text-xs font-medium text-slate-300 transition hover:border-brand-500/50 hover:text-white disabled:opacity-60 ${
                onPlay ? 'w-8' : 'flex-1 px-3'
              }`}
            >
              <Icon name="bookmark" size={13} />
              {onPlay ? null : 'Watch later'}
            </button>
          ) : null}

          {onDecline ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecline(movie)}
              title="Not interested"
              aria-label={`Decline ${movie.title}`}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-ink-600 text-xs font-medium text-slate-400 transition hover:border-rose-500/50 hover:text-rose-200 disabled:opacity-60 ${
                onPlay ? 'w-8' : 'flex-1 px-3'
              }`}
            >
              <Icon name="close" size={13} />
              {onPlay ? null : 'Decline'}
            </button>
          ) : null}

          {onUndo ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onUndo(movie)}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-ink-600 px-3 text-xs font-medium text-slate-300 transition hover:border-ink-500 hover:text-white disabled:opacity-60"
            >
              <Icon name="trash" size={12} />
              Remove
            </button>
          ) : null}
        </div>

        {!playable ? (
          <p
            className="mt-3 flex items-center gap-1.5 text-[0.68rem] text-slate-600"
            title="A playable stream resolves from the Internet Archive when that source is reachable."
          >
            <Icon name="info" size={11} className="shrink-0" />
            <span className="truncate">Stream resolves at play time</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
