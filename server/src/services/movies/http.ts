import { config } from '../../config.js';

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
      throw new Error(`${url} responded ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
