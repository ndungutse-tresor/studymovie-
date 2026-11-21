import { useState } from 'react';
import type { Movie } from '../../lib/types';
import { ArtCover } from './ArtCover';

/** The film's poster image, or a print-style cover when there is none or it fails to load. */
export function FilmArt({ movie }: { movie: Pick<Movie, 'title' | 'year' | 'genres' | 'posterUrl'> }) {
  const [failed, setFailed] = useState(false);

  if (movie.posterUrl && !failed) {
    return <img src={movie.posterUrl} alt="" loading="lazy" draggable={false} onError={() => setFailed(true)} />;
  }
  return <ArtCover title={movie.title} author={movie.genres[0] ?? 'Feature film'} tag={movie.year ? String(movie.year) : undefined} />;
}
