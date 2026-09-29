import { config } from '../../config.js';

/**
 * The URL without its query string. Provider errors are stored and shown to
 * learners as source status, and several providers take their API key as a
 * query parameter, so the query must never reach a message.
 */
function redact(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return 'upstream request';
  }
}

/** A short reason from a provider's JSON error body, when it has one. */
async function reason(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string }; status_message?: string };
    const message = body.error?.message ?? body.status_message;
    return message ? `: ${message.replace(/<[^>]+>/g, '').slice(0, 160)}` : '';
  } catch {
    return '';
  }
}

/** A fetch with a hard timeout, so a slow source cannot stall a request. */
export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.movies.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'StudyReel/1.0 (learning platform; contact: admin@studyreel.io)',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`${redact(url)} responded ${response.status}${await reason(response)}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${redact(url)} did not respond within ${config.movies.requestTimeoutMs} ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
