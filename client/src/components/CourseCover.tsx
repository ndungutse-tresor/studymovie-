import type { ReactNode } from 'react';
import { accentColors, categoryIcon } from '../lib/format';
import { Icon } from './Icon';

/** The course's accent colour as a lit, gridded surface with its category mark. */
export function CourseCover({
  accent,
  category,
  className = '',
  compact = false,
  bare = false,
  children,
}: {
  accent: string;
  category: string;
  className?: string;
  compact?: boolean;
  /** Surface only, without the category marks — for use as a backdrop. */
  bare?: boolean;
  children?: ReactNode;
}) {
  const [light, deep] = accentColors(accent);
  const icon = categoryIcon(category);
  const position = className.split(/\s+/).includes('absolute') ? '' : 'relative';

  return (
    <div
      className={`${position} isolate overflow-hidden ${className}`}
      style={{
        backgroundImage: `radial-gradient(110% 130% at 100% 0%, ${light}4d, transparent 60%), linear-gradient(140deg, ${deep}, #0d0f14 85%)`,
      }}
    >
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" />
      {bare ? null : compact ? (
        <div className="relative flex h-full w-full items-center justify-center text-white/90">
          <Icon name={icon} size={20} />
        </div>
      ) : (
        <>
          <Icon
            name={icon}
            size={112}
            strokeWidth={1}
            className="pointer-events-none absolute -bottom-6 -right-4 text-white/[0.09]"
          />
          <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-inset ring-white/15 backdrop-blur">
            <Icon name={icon} size={18} />
          </span>
          {children}
        </>
      )}
    </div>
  );
}
