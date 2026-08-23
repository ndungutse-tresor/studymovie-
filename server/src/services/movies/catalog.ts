import type { Movie } from './types.js';

interface CatalogEntry {
  title: string;
  year: number;
  runtimeMinutes: number;
  genres: string[];
  synopsis: string;
  popularity: number;
  rating: number;
}

/**
 * A curated public-domain catalogue bundled with the application.
 *
 * It keeps the movie rails populated when an upstream source is unreachable —
 * an offline deployment, a restricted egress policy, or a provider outage.
 * Entries deliberately carry no hard-coded stream identifier: the aggregator
 * resolves a playable item from the Internet Archive when the network is
 * available, and the UI presents the entry with a source link when it is not.
 */
const ENTRIES: CatalogEntry[] = [
  { title: 'Night of the Living Dead', year: 1968, runtimeMinutes: 96, genres: ['Horror', 'Thriller'], popularity: 94, rating: 7.8, synopsis: 'Strangers barricade themselves inside a farmhouse as the recently dead begin to walk. Released without a copyright notice, it entered the public domain and reshaped the horror genre.' },
  { title: 'Nosferatu', year: 1922, runtimeMinutes: 94, genres: ['Horror', 'Silent'], popularity: 88, rating: 7.9, synopsis: 'F. W. Murnau’s unauthorised adaptation of Dracula, and the film that established the visual language of screen vampires.' },
  { title: 'Metropolis', year: 1927, runtimeMinutes: 148, genres: ['Science Fiction', 'Silent', 'Drama'], popularity: 91, rating: 8.3, synopsis: 'In a stratified future city, the son of the ruling industrialist discovers the machine workers who sustain it. A foundational work of science-fiction design.' },
  { title: 'The General', year: 1926, runtimeMinutes: 79, genres: ['Comedy', 'Action', 'Silent'], popularity: 82, rating: 8.1, synopsis: 'Buster Keaton pursues his stolen locomotive through enemy lines, performing every stunt himself. Widely regarded as the finest silent comedy.' },
  { title: 'Sherlock Jr.', year: 1924, runtimeMinutes: 45, genres: ['Comedy', 'Silent'], popularity: 74, rating: 8.2, synopsis: 'A projectionist dreams himself into the film he is showing, in a sequence of visual invention that still reads as astonishing.' },
  { title: 'The Kid', year: 1921, runtimeMinutes: 68, genres: ['Comedy', 'Drama', 'Silent'], popularity: 79, rating: 8.2, synopsis: 'Chaplin’s Tramp raises an abandoned child, balancing slapstick against genuine tenderness in his first full-length feature.' },
  { title: 'Charade', year: 1963, runtimeMinutes: 113, genres: ['Mystery', 'Romance', 'Thriller'], popularity: 86, rating: 7.9, synopsis: 'A widow in Paris discovers that several men want the fortune her husband hid. A defective copyright notice placed it in the public domain.' },
  { title: 'His Girl Friday', year: 1940, runtimeMinutes: 92, genres: ['Comedy', 'Romance'], popularity: 77, rating: 7.9, synopsis: 'An editor schemes to keep his star reporter, and ex-wife, from remarrying. The fastest dialogue in classic Hollywood.' },
  { title: 'The Cabinet of Dr. Caligari', year: 1920, runtimeMinutes: 76, genres: ['Horror', 'Mystery', 'Silent'], popularity: 72, rating: 8.0, synopsis: 'A hypnotist and a sleepwalker in a town of painted, impossible angles. The defining work of German Expressionist cinema.' },
  { title: 'Carnival of Souls', year: 1962, runtimeMinutes: 78, genres: ['Horror', 'Mystery'], popularity: 68, rating: 7.1, synopsis: 'The sole survivor of a car accident is drawn toward an abandoned pavilion, in a low-budget film of unusual atmosphere.' },
  { title: 'D.O.A.', year: 1949, runtimeMinutes: 83, genres: ['Film Noir', 'Thriller'], popularity: 65, rating: 7.2, synopsis: 'A man walks into a police station to report a murder — his own. Fatally poisoned, he has days to find the killer.' },
  { title: 'Detour', year: 1945, runtimeMinutes: 68, genres: ['Film Noir', 'Drama'], popularity: 63, rating: 7.2, synopsis: 'A hitchhiking pianist makes one bad decision and then a worse one. Shot in six days and studied ever since.' },
  { title: 'Scarlet Street', year: 1945, runtimeMinutes: 103, genres: ['Film Noir', 'Drama'], popularity: 61, rating: 7.7, synopsis: 'Fritz Lang’s study of a mild cashier drawn into fraud and worse by a woman who is playing him.' },
  { title: 'The Stranger', year: 1946, runtimeMinutes: 95, genres: ['Film Noir', 'Thriller'], popularity: 66, rating: 7.3, synopsis: 'A war-crimes investigator tracks a fugitive who has built a respectable life in a small Connecticut town.' },
  { title: 'The Last Man on Earth', year: 1964, runtimeMinutes: 86, genres: ['Horror', 'Science Fiction'], popularity: 70, rating: 6.8, synopsis: 'Vincent Price as the only survivor of a plague, besieged nightly. The first adaptation of Richard Matheson’s I Am Legend.' },
  { title: 'Plan 9 from Outer Space', year: 1959, runtimeMinutes: 79, genres: ['Science Fiction', 'Horror'], popularity: 71, rating: 4.0, synopsis: 'Aliens resurrect the dead to stop humanity destroying the universe. Famous for its failures, and genuinely enjoyable for them.' },
  { title: 'House on Haunted Hill', year: 1959, runtimeMinutes: 75, genres: ['Horror', 'Mystery'], popularity: 67, rating: 6.7, synopsis: 'An eccentric millionaire offers five strangers a fortune to survive a night in a house with a violent history.' },
  { title: 'The Little Shop of Horrors', year: 1960, runtimeMinutes: 72, genres: ['Comedy', 'Horror'], popularity: 64, rating: 6.2, synopsis: 'A florist’s assistant cultivates a plant with an appetite that is difficult to satisfy legally. Shot in two days.' },
  { title: 'The 39 Steps', year: 1935, runtimeMinutes: 86, genres: ['Thriller', 'Mystery'], popularity: 73, rating: 7.6, synopsis: 'Hitchcock’s template for the innocent-man-on-the-run thriller, moving from a London music hall to the Scottish moors.' },
  { title: 'The Man Who Knew Too Much', year: 1934, runtimeMinutes: 75, genres: ['Thriller', 'Mystery'], popularity: 58, rating: 6.8, synopsis: 'A holidaying couple stumble onto an assassination plot, and their daughter is taken to buy their silence.' },
  { title: 'Suddenly', year: 1954, runtimeMinutes: 75, genres: ['Film Noir', 'Thriller'], popularity: 55, rating: 6.7, synopsis: 'Frank Sinatra as a hired gunman who seizes a family home overlooking a railway station, waiting for a presidential train.' },
  { title: 'Beat the Devil', year: 1953, runtimeMinutes: 89, genres: ['Comedy', 'Adventure'], popularity: 52, rating: 6.2, synopsis: 'John Huston and Truman Capote turn a thriller about uranium claims into a deadpan comedy about disreputable people.' },
  { title: 'Meet John Doe', year: 1941, runtimeMinutes: 122, genres: ['Drama', 'Comedy'], popularity: 60, rating: 7.6, synopsis: 'A newspaper invents a man threatening to jump from city hall in protest, then has to produce him. Capra at his most sceptical.' },
  { title: 'Nothing Sacred', year: 1937, runtimeMinutes: 77, genres: ['Comedy', 'Romance'], popularity: 50, rating: 6.8, synopsis: 'A small-town woman mistakenly diagnosed as dying is made into a national sensation by a newspaper that needs a story.' },
  { title: 'The Phantom of the Opera', year: 1925, runtimeMinutes: 93, genres: ['Horror', 'Drama', 'Silent'], popularity: 69, rating: 7.5, synopsis: 'Lon Chaney beneath the Paris Opera, in a performance and an unmasking that defined screen horror for a generation.' },
  { title: 'Battleship Potemkin', year: 1925, runtimeMinutes: 75, genres: ['Drama', 'History', 'Silent'], popularity: 62, rating: 7.9, synopsis: 'Eisenstein’s account of a naval mutiny, and the film that taught cinema what montage could do.' },
  { title: 'A Farewell to Arms', year: 1932, runtimeMinutes: 89, genres: ['Drama', 'Romance', 'War'], popularity: 47, rating: 6.4, synopsis: 'An American ambulance driver and an English nurse on the Italian front, from the Hemingway novel.' },
  { title: 'Gulliver’s Travels', year: 1939, runtimeMinutes: 76, genres: ['Animation', 'Family', 'Adventure'], popularity: 54, rating: 6.3, synopsis: 'The Fleischer studio’s feature-length animation, in which a shipwrecked traveller mediates a war between two tiny kingdoms.' },
  { title: 'McLintock!', year: 1963, runtimeMinutes: 127, genres: ['Western', 'Comedy'], popularity: 57, rating: 7.1, synopsis: 'A cattle baron’s estranged wife returns to town wanting a divorce and custody, and finds neither easily given.' },
  { title: 'Reefer Madness', year: 1936, runtimeMinutes: 66, genres: ['Drama'], popularity: 49, rating: 3.9, synopsis: 'A cautionary film financed by a church group, later rediscovered and enjoyed for reasons its makers did not intend.' },
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const catalogMovies: Movie[] = ENTRIES.map((entry) => ({
  id: `catalog:${slugify(entry.title)}-${entry.year}`,
  source: 'catalog' as const,
  title: entry.title,
  year: entry.year,
  synopsis: entry.synopsis,
  genres: entry.genres,
  runtimeMinutes: entry.runtimeMinutes,
  posterUrl: null,
  sourceUrl: `https://archive.org/search?query=${encodeURIComponent(`${entry.title} ${entry.year}`)}`,
  streamUrl: null,
  embedUrl: null,
  popularity: entry.popularity,
  rating: entry.rating,
  licence: 'Public domain. Stream resolves from the Internet Archive when reachable.',
}));

export const catalogGenres: string[] = [
  ...new Set(catalogMovies.flatMap((movie) => movie.genres)),
].sort();
