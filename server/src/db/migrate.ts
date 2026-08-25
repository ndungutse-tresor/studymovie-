import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * `schema.sql` sits next to this file in src/, and tsc does not copy non-TS
 * assets into dist/, so both locations are checked.
 */
function resolveSchemaFile(): string {
  const candidates = [
    path.join(here, 'schema.sql'),
    path.join(here, '..', '..', 'src', 'db', 'schema.sql'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Unable to locate schema.sql (looked in: ${candidates.join(', ')})`);
  return found;
}

export async function applySchema(): Promise<void> {
  const sql = fs.readFileSync(resolveSchemaFile(), 'utf8');
  await pool.query(sql);
}

const invokedDirectly = process.argv[1]?.includes('migrate');
if (invokedDirectly) {
  applySchema()
    .then(() => {
      console.log('Schema applied.');
      return pool.end();
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exitCode = 1;
      return pool.end();
    });
}
