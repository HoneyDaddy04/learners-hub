import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import { requireMember, requireUser } from './lib/auth.js';
import { ApiError } from './lib/errors.js';
import { me } from './routes/me.js';
import { members, roles } from './routes/members.js';
import { pathRoutes } from './routes/paths.js';
import { enrollmentRoutes, progressRoutes, teamRoutes } from './routes/learning.js';

export const app = new Hono();

app.use('*', logger());

// The web app normally reaches the API through Vercel's /api rewrite (same origin).
// ALLOWED_ORIGINS lets a browser call Cloud Run directly too, e.g. from a preview deploy.
const origins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
if (origins.length > 0) {
  app.use('/api/*', cors({ origin: origins, allowHeaders: ['Authorization', 'Content-Type'], allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
}

app.get('/healthz', (c) => c.json({ ok: true }));

const scoped = new Hono();
scoped.use('*', requireMember);
scoped.route('/members', members);
scoped.route('/job-roles', roles);
scoped.route('/paths', pathRoutes);
scoped.route('/enrollments', enrollmentRoutes);
scoped.route('/progress', progressRoutes);
scoped.route('/team', teamRoutes);

const api = new Hono();
api.use('*', requireUser);
api.route('/me', me);
api.route('/', scoped);

app.route('/api', api);

app.notFound((c) => c.json({ error: 'Not found', code: 'not_found' }, 404));

app.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ error: err.message, code: err.code }, err.status as ContentfulStatusCode);
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue?.path.join('.');
    return c.json({ error: field ? `${field}: ${issue.message}` : issue?.message ?? 'Invalid request', code: 'bad_request' }, 400);
  }
  console.error(err);
  return c.json({ error: 'Something went wrong', code: 'error' }, 500);
});
