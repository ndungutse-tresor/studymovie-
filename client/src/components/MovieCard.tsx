import type { Movie, MovieDecision } from '../lib/types';
import { Icon } from './Icon';
import { Poster } from './Poster';

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
  WATCH_LATER: 'Saved',
  DECLINED: 'Declined',
  WATCHED: 'Watched',
};

const NEW_FOR_DAYS = 14;

/** Published by its source within the last two weeks. */
function isRecent(addedAt: string | null | undefined): boolean {
  if (!addedAt) return false;
  const age = Date.now() - Date.parse(addedAt);
  return age >= 0 && age < NEW_FOR_DAYS * 86_400_000;
}

const ICON_BUTTON =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white disabled:opacity-60';

export function MovieCard({ movie, rank, busy, onPlay, onSave, onDecline, onUndo }: MovieCardProps) {
  const saved = movie.decision === 'WATCH_LATER';

  return (
    <article className="group flex flex-col">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-lift ring-1 ring-white/10 transition duration-300 group-hover:ring-white/25">
        <Poster
          title={movie.title}
          year={movie.year}
          genre={rank === undefined ? movie.genres[0] : null}
          posterUrl={movie.posterUrl}
          className="h-full w-full transition duration-500 group-hover:scale-[1.03]"
        />

        {rank !== undefined ? (
          <span className="absolute left-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-md bg-ink-950/80 px-1.5 font-mono text-2xs font-semibold text-white ring-1 ring-white/15 backdrop-blur">
            {rank}
          </span>
        ) : null}

        {movie.rating !== null ? (
          <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md bg-ink-950/80 px-1.5 py-0.5 text-2xs font-semibold text-reel-300 ring-1 ring-white/10 backdrop-blur">
            <Icon name="star" size={10} filled />
            {movie.rating.toFixed(1)}
          </span>
        ) : null}

        {!movie.decision && isRecent(movie.addedAt) ? (
          <span className="absolute bottom-2.5 left-2.5 rounded-md bg-reel-400 px-1.5 py-0.5 text-2xs font-semibold text-ink-950">
            New
          </span>
        ) : null}

        {movie.decision ? (
          <span
            className={`absolute bottom-2.5 left-2.5 rounded-md px-1.5 py-0.5 text-2xs font-semibold backdrop-blur ${
              movie.decision === 'DECLINED'
                ? 'bg-rose-500/85 text-white'
                : movie.decision === 'WATCHED'
                  ? 'bg-ink-950/85 text-slate-300 ring-1 ring-white/10'
                  : 'bg-brand-500/90 text-white'
            }`}
          >
            {DECISION_LABEL[movie.decision]}
          </span>
        ) : null}

        {/* Synopsis on hover for pointer devices; the actions below stay reachable everywhere. */}
        <div className="pointer-events-none absolute inset-0 hidden flex-col justify-end bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/10 p-3.5 opacity-0 transition duration-300 group-hover:opacity-100 sm:flex">
          <p className="line-clamp-6 text-xs leading-5 text-slate-200">{movie.synopsis}</p>
        </div>
      </div>

      <div className="mt-3 min-w-0">
        <h3 className="truncate text-sm font-semibold text-white" title={movie.title}>
          {movie.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {[movie.year, movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : null, movie.genres[0]]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <div className="mt-3 flex gap-1.5">
        {onPlay ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPlay(movie)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-reel-400/15 px-3 text-xs font-semibold text-reel-200 ring-1 ring-inset ring-reel-400/30 transition hover:bg-reel-400 hover:text-ink-950 disabled:opacity-60"
          >
            <Icon name="play" size={11} />
            Watch
          </button>
        ) : null}

        {onSave ? (
          <button
            type="button"
            disabled={busy || saved}
            onClick={() => onSave(movie)}
            title={saved ? 'Saved for later' : 'Save for later'}
            aria-label={saved ? `${movie.title} is saved for later` : `Save ${movie.title} for later`}
            className={`${ICON_BUTTON} ${onPlay ? 'w-8' : 'flex-1 px-2.5'} ${saved ? 'text-brand-200' : ''}`}
          >
            <Icon name="bookmark" size={13} filled={saved} />
            {onPlay ? null : saved ? 'Saved' : 'Save'}
          </button>
        ) : null}

        {onDecline ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecline(movie)}
            title="Not interested"
            aria-label={`Decline ${movie.title}`}
            className={`${ICON_BUTTON} hover:!border-rose-400/40 hover:!text-rose-200 ${onPlay ? 'w-8' : 'flex-1 px-2.5'}`}
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
            title="Remove from this list"
            aria-label={`Remove ${movie.title} from this list`}
            className={`${ICON_BUTTON} ${onPlay ? 'w-8' : 'flex-1 px-2.5'}`}
          >
            <Icon name="trash" size={12} />
            {onPlay ? null : 'Remove'}
          </button>
        ) : null}
      </div>
    </article>
  );
}
