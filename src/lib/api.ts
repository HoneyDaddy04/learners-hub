import { auth } from './firebase';

/** Same-origin by default: Vite proxies /api locally and Vercel rewrites it to Cloud Run in production. */
const BASE = import.meta.env.VITE_API_BASE ?? '/api';
// AI path building streams for minutes, longer than Vercel's proxy allows, so it can go
// straight to Cloud Run (whose ALLOWED_ORIGINS must then include this site).
const STREAM_BASE = import.meta.env.VITE_STREAM_API_BASE ?? BASE;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request(path: string, init: RequestInit = {}, base = BASE): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(base + path, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`);
  }
  return res;
}

export const api = {
  get: async <T>(path: string) => (await request(path)).json() as Promise<T>,
  post: async <T = unknown>(path: string, body?: unknown) =>
    (await request(path, { method: 'POST', body: JSON.stringify(body ?? {}) })).json() as Promise<T>,
  patch: async <T = unknown>(path: string, body: unknown) =>
    (await request(path, { method: 'PATCH', body: JSON.stringify(body) })).json() as Promise<T>,
  delete: async <T = unknown>(path: string) => (await request(path, { method: 'DELETE' })).json() as Promise<T>,
  /** POST that streams newline-delimited JSON events back. */
  async stream<E>(path: string, body: unknown, onEvent: (e: E) => void): Promise<void> {
    const res = await request(path, { method: 'POST', body: JSON.stringify(body) }, STREAM_BASE);
    const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as E);
    }
    if (buffer.trim()) onEvent(JSON.parse(buffer) as E);
  },
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
