import { Link } from 'react-router-dom';

/** The mark on its own: a frame aperture with a play cue, drawn rather than imported. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-b from-brand-400 to-brand-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_-10px_rgba(53,102,240,0.9)]"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="14" rx="3" stroke="white" strokeWidth="1.9" />
        <path d="M8 5v14M16 5v14" stroke="white" strokeOpacity="0.5" strokeWidth="1.4" />
        <path d="M11 9.6v4.8l4-2.4-4-2.4Z" fill="white" />
      </svg>
    </span>
  );
}

export function Brand({ to = '/', compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label="StudyReel home">
      <BrandMark />
      {!compact ? (
        <span className="text-[1.05rem] font-semibold tracking-tight text-white">
          Study<span className="text-slate-400">Reel</span>
        </span>
      ) : null}
    </Link>
  );
}
