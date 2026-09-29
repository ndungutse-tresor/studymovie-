/**
 * Upload titles and subject tags are written for search engines, not people:
 * "Carnival of Souls (1962) Restored Public Domain Horror", "FULL MOVIE: The
 * Kid", subjects like "feature film; 1961; public domain". These helpers reduce
 * them to a clean title, a release year, and a small set of known genres.
 */

const PROMO_PREFIX = /^\s*(?:full|free)\s+(?:hd\s+)?(?:movie|film)\s*[:|\-–—]\s*/i;
const PROMO_SUFFIX = /\s*[|\-–—:]\s*(?:full|free|classic|restored|public domain|hd|4k|official)\b.*$/i;
const BRACKETED = /\s*[[(](?:[^\])]*\b(?:full|free|hd|4k|official|restored|subtitles?|english|trailers?|public domain|remastered)\b[^\])]*)[\])]/gi;
const YEAR_IN_PARENS = /\((\d{4})\)/;

export function cleanTitle(raw: string): { title: string; year: number | null } {
  let title = raw.replace(/\s+/g, ' ').trim();
  let year: number | null = null;

  // "Title (1962) anything after" — the year closes the real title.
  const yearMatch = YEAR_IN_PARENS.exec(title);
  if (yearMatch) {
    const candidate = Number.parseInt(yearMatch[1], 10);
    if (candidate >= 1880 && candidate <= new Date().getFullYear()) year = candidate;
    const before = title.slice(0, yearMatch.index).trim();
    if (before.length > 1) title = before;
  }

  title = title
    .split(' | ')[0]
    .replace(PROMO_PREFIX, '')
    .replace(BRACKETED, '')
    .replace(PROMO_SUFFIX, '')
    .replace(/[\s\-–—:|,]+$/, '')
    .trim();

  return { title: title || raw.trim(), year };
}

/** Canonical genre names, and the words in tags or titles that indicate them. */
const GENRE_KEYWORDS: [string, RegExp][] = [
  ['Horror', /\bhorror\b|\bzombie|\bvampire/i],
  ['Science Fiction', /\bsci[\s-]?fi\b|science fiction/i],
  ['Comedy', /\bcomed(?:y|ies)\b|\bslapstick\b/i],
  ['Drama', /\bdrama\b/i],
  ['Thriller', /\bthriller\b|\bsuspense\b/i],
  ['Mystery', /\bmystery\b|\bdetective\b/i],
  ['Film Noir', /\bnoir\b/i],
  ['Crime', /\bcrime\b|\bgangster/i],
  ['Western', /\bwestern\b|\bcowboy/i],
  ['Romance', /\bromance\b|\bromantic\b/i],
  ['Adventure', /\badventure\b/i],
  ['Action', /\baction\b|\bmartial arts\b/i],
  ['War', /\bwar\b|\bwwii\b|world war/i],
  ['Musical', /\bmusical\b/i],
  ['Animation', /\banimat(?:ion|ed)\b|\bcartoon/i],
  ['Documentary', /\bdocumentar(?:y|ies)\b/i],
  ['Fantasy', /\bfantasy\b/i],
  ['Family', /\bfamily\b|\bchildren/i],
  ['Silent', /\bsilent\b/i],
];

export function normaliseGenres(tags: string[], extraText = ''): string[] {
  const haystack = `${tags.join(' ; ')} ; ${extraText}`;
  return GENRE_KEYWORDS.filter(([, pattern]) => pattern.test(haystack))
    .map(([genre]) => genre)
    .slice(0, 4);
}

/**
 * StudyReel is a learning platform and viewing time is a reward, so the open
 * collections' adult, exploitation, and atrocity material is left out. Matched
 * against titles and subject tags only; descriptions mention these words in
 * passing too often to be a reliable signal.
 */
const UNSUITABLE =
  /\b(?:sex|sexual|sexploitation|erotic|erotica|nud(?:e|es|ity|ist)|adults? only|burlesque|stag films?|strip ?tease|sex hygiene|propaganda|concentration camps?|atrocit(?:y|ies)|execution footage)\b/i;
const NOT_A_FILM = /^(?:public domain|full movies?|free movies?|movie trailers?|trailers?)\b/i;

export function isSuitable(title: string, tags: string[] = []): boolean {
  return !NOT_A_FILM.test(title.trim()) && !UNSUITABLE.test(`${title} ; ${tags.join(' ; ')}`);
}

/** Collapses views or downloads, which span orders of magnitude, onto 0-100. */
export function popularityFromCount(count: number | undefined, ceilingLog10: number): number {
  if (!count || count <= 0) return 0;
  const scaled = (Math.log10(count) / ceilingLog10) * 100;
  return Math.max(1, Math.min(100, Math.round(scaled)));
}
