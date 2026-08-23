import { Link } from 'react-router-dom';

/** Wordmark: a frame aperture beside a progress arc, drawn rather than imported. */
export function Brand({ to = '/', compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 shadow-[0_10px_24px_-12px_rgba(53,102,240,0.9)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="14" rx="3" stroke="white" strokeWidth="1.8" />
          <path d="M8 5v14M16 5v14" stroke="white" strokeOpacity="0.55" strokeWidth="1.4" />
          <path d="M11 9.6v4.8l4-2.4-4-2.4Z" fill="white" />
        </svg>
      </span>
      {!compact ? (
        <span className="text-[1.05rem] font-bold tracking-tight text-white">
          Study<span className="text-brand-300">Reel</span>
        </span>
      ) : null}
    </Link>
  );
}
