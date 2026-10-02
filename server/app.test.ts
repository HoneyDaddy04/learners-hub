import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('api app', () => {
  it('answers health checks without auth', async () => {
    const res = await app.request('/healthz');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('rejects API calls without a token', async () => {
    for (const path of ['/api/me', '/api/paths', '/api/team']) {
      const res = await app.request(path);
      expect(res.status).toBe(401);
      expect((await res.json()).code).toBe('unauthorized');
    }
  });

  it('rejects a malformed token', async () => {
    const res = await app.request('/api/me', { headers: { Authorization: 'Bearer not-a-jwt' } });
    expect(res.status).toBe(401);
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
  });
});
