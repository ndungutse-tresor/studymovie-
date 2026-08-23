import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { config } from '../config.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * `schema.sql` lives next to this file in src/, but tsc does not copy non-TS
 * assets into dist/. Resolve both locations so `npm start` works from a build.
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

export const db = new Database(config.databaseFile);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(resolveSchemaFile(), 'utf8'));

/** Runs `fn` inside a transaction and returns its result. */
export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}

export function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function toIso(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

/** SQLite stores our timestamps as `YYYY-MM-DD HH:MM:SS` in UTC. */
export function parseSqlDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalised = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
