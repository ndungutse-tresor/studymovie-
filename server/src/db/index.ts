import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { config } from '../config.js';

const { Pool, types } = pg;

/**
 * Return NUMERIC as a JavaScript number. The driver hands back strings by
 * default to protect precision, which we do not need for the small aggregates
 * this application computes.
 */
types.setTypeParser(1700, (value) => Number.parseFloat(value));
// int8 (COUNT) likewise arrives as a string.
types.setTypeParser(20, (value) => Number.parseInt(value, 10));

export const pool = new Pool({
  connectionString: config.databaseUrl,
  // Serverless invocations are short-lived and numerous, so each instance keeps
  // a deliberately small pool and hands connections back quickly.
  max: config.databasePoolMax,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 15_000,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (error) => {
  console.error('Unexpected error on an idle database client', error);
});

/**
 * Converts `?` placeholders into Postgres `$n` form, ignoring anything inside a
 * quoted string so a literal question mark in SQL text is left alone.
 */
export function toPositional(sql: string): string {
  let out = '';
  let index = 0;
  let quote: "'" | '"' | null = null;

  for (let position = 0; position < sql.length; position += 1) {
    const char = sql[position];

    if (quote) {
      out += char;
      if (char === quote) {
        // A doubled quote is an escaped quote, not the end of the literal.
        if (sql[position + 1] === quote) {
          out += sql[position + 1];
          position += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      out += char;
      continue;
    }

    if (char === '?') {
      index += 1;
      out += `$${index}`;
      continue;
    }

    out += char;
  }

  return out;
}

const transactionStore = new AsyncLocalStorage<pg.PoolClient>();

async function exec(sql: string, params: readonly unknown[]): Promise<pg.QueryResult> {
  const text = toPositional(sql);
  const client = transactionStore.getStore();
  if (client) return client.query(text, params as unknown[]);
  return pool.query(text, params as unknown[]);
}

/** All matching rows. */
export async function query<T>(sql: string, ...params: unknown[]): Promise<T[]> {
  const result = await exec(sql, params);
  return result.rows as T[];
}

/** The first matching row, or undefined. */
export async function one<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
  const result = await exec(sql, params);
  return result.rows[0] as T | undefined;
}

/** Number of rows affected. */
export async function run(sql: string, ...params: unknown[]): Promise<number> {
  const result = await exec(sql, params);
  return result.rowCount ?? 0;
}

/**
 * Runs `fn` inside a transaction. The client is held in async local storage, so
 * every nested `query`/`one`/`run` — including calls made by helper functions —
 * joins the same transaction without needing the client threaded through.
 */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  // A nested call joins the transaction already in progress.
  if (transactionStore.getStore()) return fn();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await transactionStore.run(client, fn);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The connection may already be broken; the original error is what matters.
    }
    throw error;
  } finally {
    client.release();
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(date: Date): string {
  return date.toISOString();
}

/** Postgres returns `timestamptz` as a Date; incoming strings are also accepted. */
export function parseSqlDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const normalised = value.includes('T') || value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function closePool(): Promise<void> {
  await pool.end();
}
