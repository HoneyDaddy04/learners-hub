import { Hono } from 'hono';
import { alias } from 'drizzle-orm/pg-core';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import type { BeatResponse, MyEnrollment, QuizResult, TeamRow } from '../../shared/types.js';
import { db } from '../db/client.js';
import {
  catalogItems, enrollments, itemProgress, jobRoles, memberships, moduleItems, pathModules, paths, quizAttempts, quizQuestions,
} from '../db/schema.js';
import { isAdmin, isManagerOrAdmin, requireRole, type Member } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { progressFor, progressKey, refreshCompletion } from '../lib/pathProgress.js';
import { creditBeat, isWatched } from '../lib/progress.js';
import { body, idParam } from '../lib/validate.js';
import { grade } from '../services/quiz.js';

const today = () => new Date().toISOString().slice(0, 10);

// ---------- Enrollments ----------

export const enrollmentRoutes = new Hono();

const assigner = alias(memberships, 'assigner');

enrollmentRoutes.get('/mine', async (c) => {
  const m = c.get('member');
  const rows = await db
    .select({
      id: enrollments.id, pathId: enrollments.pathId, pathTitle: paths.title, roleName: paths.roleName, source: enrollments.source,
      dueDate: enrollments.dueDate, completedAt: enrollments.completedAt, assignedByName: assigner.name,
    })
    .from(enrollments)
    .innerJoin(paths, eq(enrollments.pathId, paths.id))
    .leftJoin(assigner, eq(enrollments.assignedBy, assigner.id))
    .where(and(eq(enrollments.membershipId, m.id), eq(paths.status, 'published')))
    .orderBy(asc(enrollments.dueDate), asc(paths.title));
  const progress = await progressFor([m.id], rows.map((r) => r.pathId));
  const res: MyEnrollment[] = rows.map((r) => ({
    ...r,
    completedAt: r.completedAt?.toISOString() ?? null,
    progress: progress.get(progressKey(m.id, r.pathId))!,
  }));
  return c.json(res);
});

async function publishedPath(m: Member, pathId: string) {
  const [path] = await db.select({ id: paths.id }).from(paths).where(and(eq(paths.id, pathId), eq(paths.orgId, m.orgId), eq(paths.status, 'published')));
  if (!path) throw notFound('Path not found');
  return path;
}

enrollmentRoutes.post('/', async (c) => {
  const m = c.get('member');
  const { pathId } = await body(c, z.object({ pathId: z.string().uuid() }));
  await publishedPath(m, pathId);
  await db.insert(enrollments).values({ orgId: m.orgId, membershipId: m.id, pathId, source: 'self' }).onConflictDoNothing();
  return c.json({ ok: true }, 201);
});

enrollmentRoutes.post('/assign', requireRole(isManagerOrAdmin, 'Only managers and admins can assign paths'), async (c) => {
  const m = c.get('member');
  const input = await body(c, z.object({
    pathId: z.string().uuid(),
    membershipIds: z.array(z.string().uuid()).min(1).max(500),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date').nullable().optional(),
  }));
  if (input.dueDate && input.dueDate < today()) throw badRequest('The due date is in the past');
  await publishedPath(m, input.pathId);

  // Managers assign to their direct reports; admins to anyone in the org.
  const targets = await db
    .select({ id: memberships.id, managerId: memberships.managerId })
    .from(memberships)
    .where(and(eq(memberships.orgId, m.orgId), inArray(memberships.id, input.membershipIds), ne(memberships.status, 'removed')));
  if (targets.length !== new Set(input.membershipIds).size) throw badRequest('Some people were not found');
  if (!isAdmin(m) && targets.some((t) => t.managerId !== m.id)) throw forbidden('Managers can only assign paths to their own team');

  const dueDate = input.dueDate ?? null;
  await db
    .insert(enrollments)
    .values(targets.map((t) => ({ orgId: m.orgId, membershipId: t.id, pathId: input.pathId, source: 'assigned' as const, assignedBy: m.id, dueDate })))
    .onConflictDoUpdate({ target: [enrollments.membershipId, enrollments.pathId], set: { source: 'assigned', assignedBy: m.id, dueDate } });
  await audit(m.orgId, c.get('user').uid, 'path.assigned', input.pathId, { count: targets.length, dueDate });
  return c.json({ assigned: targets.length });
});

enrollmentRoutes.delete('/:id', async (c) => {
  const m = c.get('member');
  const id = idParam(c);
  const [e] = await db.select().from(enrollments).where(and(eq(enrollments.id, id), eq(enrollments.orgId, m.orgId)));
  if (!e) throw notFound('Enrollment not found');
  const ownSelfEnrollment = e.membershipId === m.id && e.source === 'self';
  if (!ownSelfEnrollment && !isManagerOrAdmin(m)) throw forbidden('Ask your manager to remove an assigned path');
  await db.delete(enrollments).where(eq(enrollments.id, id));
  return c.json({ ok: true });
});

// ---------- Progress and quizzes ----------

export const progressRoutes = new Hono();

/** The item, its path and the caller's enrollment; progress only counts on paths you are enrolled in. */
async function itemForMember(m: Member, moduleItemId: string) {
  const [item] = await db
    .select({ id: moduleItems.id, pathId: pathModules.pathId, source: catalogItems.source, durationSec: catalogItems.durationSec })
    .from(moduleItems)
    .innerJoin(pathModules, eq(moduleItems.moduleId, pathModules.id))
    .innerJoin(paths, eq(pathModules.pathId, paths.id))
    .innerJoin(catalogItems, eq(moduleItems.catalogItemId, catalogItems.id))
    .where(and(eq(moduleItems.id, moduleItemId), eq(paths.orgId, m.orgId), eq(paths.status, 'published')));
  if (!item) throw notFound('Lesson not found');
  const [e] = await db.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.membershipId, m.id), eq(enrollments.pathId, item.pathId)));
  if (!e) throw forbidden('Start this path before tracking progress');
  return item;
}

progressRoutes.post('/beat', async (c) => {
  const m = c.get('member');
  const input = await body(c, z.object({ moduleItemId: z.string().uuid(), positionSec: z.number().min(0).max(24 * 3600) }));
  const item = await itemForMember(m, input.moduleItemId);
  if (item.source !== 'youtube') throw badRequest('Only videos send watch progress');

  const [prev] = await db.select().from(itemProgress).where(and(eq(itemProgress.membershipId, m.id), eq(itemProgress.moduleItemId, item.id)));
  const next = creditBeat(
    { watchedSec: prev?.watchedSec ?? 0, lastPositionSec: prev?.lastPositionSec ?? 0, lastBeatAt: prev?.lastBeatAt ?? null },
    input.positionSec,
    new Date(),
  );
  const wasDone = prev?.status === 'done';
  const done = wasDone || isWatched(next.watchedSec, item.durationSec);
  const values = {
    watchedSec: next.watchedSec, lastPositionSec: next.lastPositionSec, lastBeatAt: next.lastBeatAt,
    status: done ? ('done' as const) : ('in_progress' as const),
    completedAt: done ? (prev?.completedAt ?? new Date()) : null,
  };
  await db
    .insert(itemProgress)
    .values({ orgId: m.orgId, membershipId: m.id, moduleItemId: item.id, ...values })
    .onConflictDoUpdate({ target: [itemProgress.membershipId, itemProgress.moduleItemId], set: values });

  const justCompleted = done && !wasDone;
  if (justCompleted) await refreshCompletion(m.id, item.pathId);
  const res: BeatResponse = { status: values.status, watchedSec: values.watchedSec, justCompleted };
  return c.json(res);
});

/** Web courses and articles cannot be measured, so the learner marks them done. */
progressRoutes.post('/complete', async (c) => {
  const m = c.get('member');
  const { moduleItemId } = await body(c, z.object({ moduleItemId: z.string().uuid() }));
  const item = await itemForMember(m, moduleItemId);
  if (item.source !== 'web') throw badRequest('Videos complete automatically once watched');
  const now = new Date();
  await db
    .insert(itemProgress)
    .values({ orgId: m.orgId, membershipId: m.id, moduleItemId: item.id, status: 'done', completedAt: now })
    .onConflictDoUpdate({ target: [itemProgress.membershipId, itemProgress.moduleItemId], set: { status: 'done', completedAt: now } });
  await refreshCompletion(m.id, item.pathId);
  return c.json({ ok: true });
});

progressRoutes.post('/quiz/:moduleId', async (c) => {
  const m = c.get('member');
  const moduleId = idParam(c, 'moduleId');
  const { answers } = await body(c, z.object({ answers: z.array(z.number().int().min(0).max(3)).max(10) }));
  const [mod] = await db
    .select({ pathId: pathModules.pathId })
    .from(pathModules)
    .innerJoin(paths, eq(pathModules.pathId, paths.id))
    .where(and(eq(pathModules.id, moduleId), eq(paths.orgId, m.orgId), eq(paths.status, 'published')));
  if (!mod) throw notFound('Module not found');
  const [e] = await db.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.membershipId, m.id), eq(enrollments.pathId, mod.pathId)));
  if (!e) throw forbidden('Start this path before taking its checks');

  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.moduleId, moduleId)).orderBy(asc(quizQuestions.position));
  if (questions.length === 0) throw badRequest('This module has no check');
  if (answers.length !== questions.length) throw badRequest('Answer every question');
  const { score, passed } = grade(questions, answers);
  await db.insert(quizAttempts).values({ orgId: m.orgId, membershipId: m.id, moduleId, answers, score, passed });
  if (passed) await refreshCompletion(m.id, mod.pathId);
  const res: QuizResult = { score, total: questions.length, passed, correct: questions.map((q, i) => answers[i] === q.correctIndex) };
  return c.json(res);
});

// ---------- Team overview ----------

export const teamRoutes = new Hono();

/** Managers see their direct reports; admins see everyone. */
teamRoutes.get('/', requireRole(isManagerOrAdmin), async (c) => {
  const m = c.get('member');
  const people = await db
    .select({
      id: memberships.id, name: memberships.name, email: memberships.email, status: memberships.status,
      department: memberships.department, jobRoleName: jobRoles.name,
    })
    .from(memberships)
    .leftJoin(jobRoles, eq(memberships.jobRoleId, jobRoles.id))
    .where(and(
      eq(memberships.orgId, m.orgId),
      ne(memberships.status, 'removed'),
      ...(isAdmin(m) ? [] : [eq(memberships.managerId, m.id)]),
    ))
    .orderBy(asc(memberships.name));
  const ids = people.map((p) => p.id);
  const rows = ids.length
    ? await db
        .select({
          id: enrollments.id, membershipId: enrollments.membershipId, pathId: enrollments.pathId, pathTitle: paths.title,
          source: enrollments.source, dueDate: enrollments.dueDate, completedAt: enrollments.completedAt,
        })
        .from(enrollments)
        .innerJoin(paths, eq(enrollments.pathId, paths.id))
        .where(and(inArray(enrollments.membershipId, ids), eq(paths.status, 'published')))
        .orderBy(asc(paths.title))
    : [];
  const progress = await progressFor(ids, [...new Set(rows.map((r) => r.pathId))]);
  const now = today();

  const res: TeamRow[] = people.map((p) => ({
    member: p,
    enrollments: rows
      .filter((r) => r.membershipId === p.id)
      .map(({ membershipId: _, ...r }) => ({
        ...r,
        completedAt: r.completedAt?.toISOString() ?? null,
        overdue: !r.completedAt && !!r.dueDate && r.dueDate < now,
        progress: progress.get(progressKey(p.id, r.pathId))!,
      })),
  }));
  return c.json(res);
});
