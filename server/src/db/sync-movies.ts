import { pool } from './index.js';
import { syncMovies } from '../services/movies/index.js';

/**
 * Pulls every film source into the library from the command line. Runs during
 * deployment so a new build ships with a current library; a source being
 * unreachable is reported, not fatal.
 */
const invokedDirectly = process.argv[1]?.includes('sync-movies');
if (invokedDirectly) {
  syncMovies()
    .then(async (summary) => {
      for (const source of summary.sources) {
        const detail = source.detail ? ` — ${source.detail}` : '';
        console.log(`  ${source.name}: ${source.status}, ${source.fetched} fetched, ${source.added} new${detail}`);
      }
      console.log(`Movie sync complete: ${summary.added} new, ${summary.total} in library (${summary.durationMs} ms).`);
      await pool.end();
    })
    .catch(async (error) => {
      console.error('Movie sync failed:', error);
      process.exitCode = 1;
      await pool.end();
    });
}
