import { useState } from 'react';
import { ArtCover } from './gallery/ArtCover';

type PosterSize = 'xs' | 'sm' | 'md' | 'lg';

interface PosterProps {
  title: string;
  year?: number | null;
  genre?: string | null;
  posterUrl?: string | null;
  /** Kept for existing callers; the drawn cover scales to any size. */
  size?: PosterSize;
  className?: string;
}

/**
 * Film artwork. Uses the provider's image when there is one; otherwise draws
 * the same print-style cover the gallery wall hangs, so a film looks the same
 * on the dashboard, in the lists, on the wall and on its film page.
 */
export function Poster({ title, year, genre, posterUrl, className = '' }: PosterProps) {
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

  return (
    <div className={`${position} overflow-hidden bg-ink-800 [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className}`} aria-hidden="true">
      <ArtCover title={title} author={genre ?? 'Feature film'} tag={year ? String(year) : undefined} />
    </div>
  );
}
