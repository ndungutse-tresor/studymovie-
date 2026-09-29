import { useState } from 'react';
import { posterGradient } from '../lib/format';

type PosterSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<PosterSize, { pad: string; frame: string; title: string; meta: boolean; initial: string | null }> = {
  xs: { pad: 'p-2', frame: 'inset-1', title: 'text-[0.8rem]', meta: false, initial: null },
  sm: { pad: 'p-3.5', frame: 'inset-1.5', title: 'text-[1.35rem]', meta: true, initial: 'text-[8rem]' },
  md: { pad: 'p-4', frame: 'inset-2', title: 'text-[1.6rem]', meta: true, initial: 'text-[9rem]' },
  lg: { pad: 'p-6', frame: 'inset-2.5', title: 'text-[2.4rem]', meta: true, initial: 'text-[13rem]' },
};

interface PosterProps {
  title: string;
  year?: number | null;
  genre?: string | null;
  posterUrl?: string | null;
  size?: PosterSize;
  className?: string;
}

/**
 * Film artwork. Uses the provider's image when there is one; otherwise draws a
 * typographic one-sheet — a muted duotone with grain, a thin inner frame, and
 * the title set in a display serif — so a catalogue without artwork still reads
 * as a shelf of films rather than a wall of placeholders.
 */
export function Poster({ title, year, genre, posterUrl, size = 'sm', className = '' }: PosterProps) {
  const [failed, setFailed] = useState(false);

  // Callers that lay the poster out as a backdrop pass `absolute`; that must win.
  const position = className.split(/\s+/).includes('absolute') ? '' : 'relative';

  if (posterUrl && !failed) {
    return (
      <div className={`${position} overflow-hidden bg-ink-800 ${className}`}>
        <img
          src={posterUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  const spec = SIZES[size];

  return (
    <div
      className={`grain ${position} isolate overflow-hidden ${className}`}
      style={{ backgroundImage: posterGradient(title) }}
      aria-hidden="true"
    >
      {spec.initial ? (
        <span
          className={`pointer-events-none absolute -right-[6%] -top-[12%] select-none font-display leading-none text-white/[0.07] ${spec.initial}`}
        >
          {title.replace(/^(The|A|An)\s+/i, '').charAt(0)}
        </span>
      ) : null}
      <span className={`pointer-events-none absolute ${spec.frame} rounded-[3px] border border-white/[0.14]`} />
      <div className={`relative flex h-full flex-col ${spec.pad}`}>
        {spec.meta && genre ? (
          <p className="text-[0.55rem] font-semibold uppercase tracking-[0.28em] text-white/55">{genre}</p>
        ) : null}
        <div className="mt-auto">
          <p className={`font-display leading-[0.98] text-white [text-wrap:balance] ${spec.title}`}>{title}</p>
          {spec.meta && year ? (
            <p className="mt-2 text-[0.6rem] font-medium tracking-[0.32em] text-white/50">{year}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
