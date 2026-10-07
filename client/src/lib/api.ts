import type { AuthResponse } from './types';

const ACCESS_KEY = 'studyreel.access';
const REFRESH_KEY = 'studyreel.refresh';

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
  fields?: { path: string; message: string }[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly fields: Record<string, string>;

  constructor(status: number, payload: ApiErrorShape) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
    this.fields = Object.fromEntries((payload.fields ?? []).map((field) => [field.path, field.message]));
  }
}

export const tokenStore = {
  access: (): string | null => localStorage.getItem(ACCESS_KEY),
  refresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  save(tokens: { accessToken: string; refreshToken: string }) {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

let refreshInFlight: Promise<boolean> | null = null;
const sessionExpiredListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

/**
 * Refreshes the access token at most once concurrently, so a burst of parallel
 * requests that all see a 401 produces one refresh rather than several.
 */
async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokenStore.refresh();
  if (!refreshToken) return false;

  refreshInFlight ??= (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as AuthResponse;
      tokenStore.save(payload);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function send<T>(method: Method, path: string, body?: unknown, retry = true): Promise<T> {
  const accessToken = tokenStore.access();

  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && retry && tokenStore.refresh()) {
    const refreshed = await refreshTokens();
    if (refreshed) return send<T>(method, path, body, false);

    tokenStore.clear();
    for (const listener of sessionExpiredListeners) listener();
  }

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => ({}))) as { error?: ApiErrorShape } & Record<string, unknown>;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload.error ?? { code: 'UNKNOWN', message: 'Something went wrong. Try again.' },
    );
  }

  return payload as T;
}

async function sendUpload<T>(path: string, file: File, fieldName: string, retry = true): Promise<T> {
  const form = new FormData();
  form.append(fieldName, file);
  const accessToken = tokenStore.access();
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
    body: form,
  });

  if (response.status === 401 && retry && tokenStore.refresh()) {
    const refreshed = await refreshTokens();
    if (refreshed) return sendUpload<T>(path, file, fieldName, false);
    tokenStore.clear();
    for (const listener of sessionExpiredListeners) listener();
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: ApiErrorShape } & Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload.error ?? { code: 'UNKNOWN', message: 'The video could not be uploaded.' },
    );
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => send<T>('GET', path),
  post: <T>(path: string, body?: unknown) => send<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => send<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string) => send<T>('DELETE', path),
  upload: <T>(path: string, file: File, fieldName = 'video') => sendUpload<T>(path, file, fieldName),
};
