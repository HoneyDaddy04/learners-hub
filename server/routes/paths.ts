import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import type { PathDetail, PathModule, PathSummary, SourcingEvent } from '../../shared/types.js';
import { db } from '../db/client.js';
import { catalogItems, enrollments, itemProgress, moduleItems, pathModules, paths, quizAttempts, quizQuestions } from '../db/schema.js';
import { isAdmin, isManagerOrAdmin, requireRole, type Member } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { badRequest, notFound } from '../lib/errors.js';
import { progressFor, progressKey } from '../lib/pathProgress.js';
import { body, idParam } from '../lib/validate.js';
import { saveDraft, sourceWithCache } from '../services/drafts.js';
import { SOURCE_KEYS } from '../services/sourcing.js';

export const pathRoutes = new Hono();

type PathRow = typeof paths.$inferSelect;

/** Staff see published paths; managers and admins also see drafts. */
async function loadPath(m: Member, id: string): Promise<PathRow> {
  const [path] = await db.select().from(paths).where(and(eq(paths.id, id), eq(paths.orgId, m.orgId)));
  if (!path || (path.status !== 'published' && !isManagerOrAdmin(m))) throw notFound('Path not found');
  return path;
}

async function loadDraft(m: Member, id: string): Promise<PathRow> {
  const path = await loadPath(m, id);
  if (path.status !== 'draft') throw badRequest('Only draft paths can be edited');
  return path;
}

async function summaries(m: Member, rows: PathRow[]): Promise<PathSummary[]> {
  const ids = rows.map((p) => p.id);
  if (ids.length === 0) return [];
  const items = await db
    .select({ pathId: pathModules.pathId, moduleId: pathModules.id, durationSec: catalogItems.durationSec })
    .from(moduleItems)
    .innerJoin(pathModules, eq(moduleItems.moduleId, pathModules.id))
    .innerJoin(catalogItems, eq(moduleItems.catalogItemId, catalogItems.id))
    .where(inArray(pathModules.pathId, ids));
  const mine = await db.select().from(enrollments).where(and(eq(enrollments.membershipId, m.id), inArray(enrollments.pathId, ids)));
  const progress = await progressFor([m.id], mine.map((e) => e.pathId));

  return rows.map((p) => {
    const pathItems = items.filter((i) => i.pathId === p.id);
    const e = mine.find((x) => x.pathId === p.id);
    return {
      id: p.id, title: p.title, roleName: p.roleName, description: p.description, level: p.level, status: p.status,
      moduleCount: new Set(pathItems.map((i) => i.moduleId)).size,
      itemCount: pathItems.length,
      totalDurationSec: pathItems.reduce((s, i) => s + (i.durationSec ?? 0), 0),
      createdAt: p.createdAt.toISOString(),
      enrollment: e
        ? { id: e.id, source: e.source, dueDate: e.dueDate, completedAt: e.completedAt?.toISOString() ?? null, progress: progress.get(progressKey(m.id, p.id))! }
        : null,
    };
  });
}

pathRoutes.get('/', async (c) => {
  const m = c.get('member');
  const status = c.req.query('status');
  const where = isManagerOrAdmin(m)
    ? and(eq(paths.orgId, m.orgId), status === 'draft' || status === 'published' || status === 'archived' ? eq(paths.status, status) : ne(paths.status, 'archived'))
    : and(eq(paths.orgId, m.orgId), eq(paths.status, 'published'));
  const rows = await db.select().from(paths).where(where).orderBy(asc(paths.title));
  return c.json(await summaries(m, rows));
});

pathRoutes.get('/:id', async (c) => {
  const m = c.get('member');
  const path = await loadPath(m, idParam(c));
  const [summary] = await summaries(m, [path]);

  const mods = await db.select().from(pathModules).where(eq(pathModules.pathId, path.id)).orderBy(asc(pathModules.position));
  const modIds = mods.map((x) => x.id);
  const items = modIds.length
    ? await db
        .select({
          id: moduleItems.id, moduleId: moduleItems.moduleId, position: moduleItems.position, why: moduleItems.why,
          catalog: {
            source: catalogItems.source, externalId: catalogItems.externalId, url: catalogItems.url, title: catalogItems.title,
            provider: catalogItems.provider, format: catalogItems.format, durationSec: catalogItems.durationSec, thumbnailUrl: catalogItems.thumbnailUrl,
          },
        })
        .from(moduleItems)
        .innerJoin(catalogItems, eq(moduleItems.catalogItemId, catalogItems.id))
        .where(inArray(moduleItems.moduleId, modIds))
        .orderBy(asc(moduleItems.position))
    : [];
  const questions = modIds.length
    ? await db.select().from(quizQuestions).where(inArray(quizQuestions.moduleId, modIds)).orderBy(asc(quizQuestions.position))
    : [];
  const progress = items.length
    ? await db.select().from(itemProgress).where(and(eq(itemProgress.membershipId, m.id), inArray(itemProgress.moduleItemId, items.map((i) => i.id))))
    : [];
  const attempts = modIds.length
    ? await db.select().from(quizAttempts).where(and(eq(quizAttempts.membershipId, m.id), inArray(quizAttempts.moduleId, modIds)))
    : [];

  const modules: PathModule[] = mods.map((mod) => {
    const tries = attempts.filter((a) => a.moduleId === mod.id);
    return {
      id: mod.id, position: mod.position, title: mod.title, summary: mod.summary,
      items: items.filter((i) => i.moduleId === mod.id).map(({ moduleId: _, ...i }) => {
        const p = progress.find((x) => x.moduleItemId === i.id);
        return { ...i, progress: p ? { status: p.status, watchedSec: p.watchedSec, lastPositionSec: p.lastPositionSec } : null };
      }),
      // correctIndex never leaves the server.
      quiz: questions.filter((q) => q.moduleId === mod.id).map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
      quizPassed: tries.some((a) => a.passed),
      bestScore: tries.length ? Math.max(...tries.map((a) => a.score)) : null,
    };
  });

  const res: PathDetail = {
    ...summary,
    context: path.context,
    modules,
    canEdit: path.status === 'draft' && isManagerOrAdmin(m),
    canPublish: path.status === 'draft' && isAdmin(m),
  };
  return c.json(res);
});

const sourceSchema = z.object({
  role: z.string().trim().min(2).max(120),
  context: z.string().trim().max(1000).optional(),
  sources: z.array(z.string().refine((s) => (SOURCE_KEYS as readonly string[]).includes(s), 'Unknown source')).min(1),
});

/**
 * AI path building takes a minute or two, so progress streams back as
 * newline-delimited JSON. Pings keep proxies from closing an idle connection.
 */
pathRoutes.post('/source', requireRole(isManagerOrAdmin, 'Only managers and admins can build paths'), async (c) => {
  const m = c.get('member');
  const uid = c.get('user').uid;
  const input = await body(c, sourceSchema);
  c.header('Content-Type', 'application/x-ndjson; charset=utf-8');
  c.header('Cache-Control', 'no-cache, no-transform');
  c.header('X-Accel-Buffering', 'no');
  return stream(c, async (s) => {
    const send = (e: SourcingEvent) => s.write(JSON.stringify(e) + '\n');
    const ping = setInterval(() => void send({ type: 'ping' }), 10_000);
    try {
      const draft = await sourceWithCache(input, (step, label) => void send({ type: 'step', step, label }));
      if (draft.modules.length === 0) {
        await send({ type: 'error', message: 'No suitable free lessons were found. Try a broader role or more sources.' });
        return;
      }
      const pathId = await saveDraft(draft, m.orgId, m.id, input);
      await audit(m.orgId, uid, 'path.drafted', pathId, { role: input.role });
      await send({ type: 'done', pathId });
    } catch (err) {
      console.error('Path sourcing failed', err);
      await send({ type: 'error', message: 'Building the path failed. Please try again in a minute.' });
    } finally {
      clearInterval(ping);
    }
  });
});

pathRoutes.patch('/:id', requireRole(isManagerOrAdmin), async (c) => {
  const m = c.get('member');
  const path = await loadPath(m, idParam(c));
  const input = await body(c, z.object({
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    level: z.string().trim().max(40).nullable().optional(),
  }));
  await db.update(paths).set(input).where(eq(paths.id, path.id));
  return c.json({ ok: true });
});

pathRoutes.delete('/:id', requireRole(isManagerOrAdmin), async (c) => {
  const m = c.get('member');
  const path = await loadDraft(m, idParam(c));
  await db.delete(paths).where(eq(paths.id, path.id));
  await audit(m.orgId, c.get('user').uid, 'path.discarded', path.id);
  return c.json({ ok: true });
});

pathRoutes.delete('/:id/modules/:moduleId', requireRole(isManagerOrAdmin), async (c) => {
  const path = await loadDraft(c.get('member'), idParam(c));
  const deleted = await db.delete(pathModules).where(and(eq(pathModules.id, idParam(c, 'moduleId')), eq(pathModules.pathId, path.id))).returning({ id: pathModules.id });
  if (deleted.length === 0) throw notFound('Module not found');
  return c.json({ ok: true });
});

pathRoutes.delete('/:id/items/:itemId', requireRole(isManagerOrAdmin), async (c) => {
  const path = await loadDraft(c.get('member'), idParam(c));
  const itemId = idParam(c, 'itemId');
  const [item] = await db
    .select({ id: moduleItems.id })
    .from(moduleItems)
    .innerJoin(pathModules, eq(moduleItems.moduleId, pathModules.id))
    .where(and(eq(moduleItems.id, itemId), eq(pathModules.pathId, path.id)));
  if (!item) throw notFound('Lesson not found');
  await db.delete(moduleItems).where(eq(moduleItems.id, itemId));
  return c.json({ ok: true });
});

pathRoutes.post('/:id/publish', requireRole(isAdmin, 'Only admins can approve paths'), async (c) => {
  const m = c.get('member');
  const path = await loadDraft(m, idParam(c));
  const [hasItems] = await db
    .select({ id: moduleItems.id })
    .from(moduleItems)
    .innerJoin(pathModules, eq(moduleItems.moduleId, pathModules.id))
    .where(eq(pathModules.pathId, path.id))
    .limit(1);
  if (!hasItems) throw badRequest('Add at least one lesson before publishing');
  await db.update(paths).set({ status: 'published', approvedBy: m.id, publishedAt: new Date() }).where(eq(paths.id, path.id));
  await audit(m.orgId, c.get('user').uid, 'path.published', path.id);
  return c.json({ ok: true });
});

pathRoutes.post('/:id/archive', requireRole(isAdmin, 'Only admins can archive paths'), async (c) => {
  const m = c.get('member');
  const path = await loadPath(m, idParam(c));
  await db.update(paths).set({ status: 'archived' }).where(eq(paths.id, path.id));
  await audit(m.orgId, c.get('user').uid, 'path.archived', path.id);
  return c.json({ ok: true });
});
