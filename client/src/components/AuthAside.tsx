import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { Poster } from './Poster';

const FILMS = [
  { title: 'The Cabinet of Dr. Caligari', year: 1920, genre: 'Horror' },
  { title: 'Metropolis', year: 1927, genre: 'Science Fiction' },
  { title: 'His Girl Friday', year: 1940, genre: 'Comedy' },
];

/**
 * The branded half of the split authentication and admissions screens: a fan
 * of one-sheets over the product's promise, with a short list beneath.
 */
export function AuthAside({
  title = 'Screen time, earned.',
  points = [
    'Study a chapter for its minimum reading time',
    'Pass its exam at the published pass mark',
    'Pick a film — the session closes itself when time is up',
  ],
  children,
}: {
  title?: string;
  points?: string[];
  children?: ReactNode;
}) {
  return (
    <aside className="relative isolate hidden overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900 p-10 lg:flex lg:flex-col">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-70" />
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-brand-500/25 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 -z-10 h-72 w-72 rounded-full bg-reel-400/10 blur-[90px]" />

      <div className="flex flex-1 items-center justify-center gap-4 py-8" aria-hidden="true">
        {FILMS.map((film, index) => (
          <div
            key={film.title}
            className="w-32 shrink-0 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] xl:w-36"
            style={{ transform: `rotate(${(index - 1) * 5}deg) translateY(${index === 1 ? -14 : 8}px)` }}
          >
            <Poster
              title={film.title}
              year={film.year}
              genre={film.genre}
              size="sm"
              className="aspect-[2/3] rounded-lg ring-1 ring-white/15"
            />
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-display text-4xl leading-tight text-white">{title}</h2>
        <ul className="mt-6 space-y-3">
          {points.map((point, index) => (
            <li key={point} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] font-mono text-2xs text-slate-400 ring-1 ring-white/10">
                {index + 1}
              </span>
              {point}
            </li>
          ))}
        </ul>
        {children}
      </div>
    </aside>
  );
}

export function AuthFooterNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-8 flex items-center gap-2 text-xs text-slate-500">
      <Icon name="shield" size={14} className="shrink-0" />
      {children}
    </p>
  );
}
