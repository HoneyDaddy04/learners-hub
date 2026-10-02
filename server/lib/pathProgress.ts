import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { ProgressInfo } from '../../shared/types.js';
import { db } from '../db/client.js';
import { enrollments, itemProgress, moduleItems, pathModules, quizAttempts, quizQuestions } from '../db/schema.js';
import { pathPercent } from './progress.js';

export const progressKey = (membershipId: string, pathId: string) => `${membershipId}:${pathId}`;

/** Progress for every (member, path) pair, keyed by progressKey. */
export async function progressFor(membershipIds: string[], pathIds: string[]): Promise<Map<string, ProgressInfo>> {
  const out = new Map<string, ProgressInfo>();
  if (membershipIds.length === 0 || pathIds.length === 0) return out;

  const items = await db
    .select({ pathId: pathModules.pathId, itemId: moduleItems.id })
    .from(moduleItems)
    .innerJoin(pathModules, eq(moduleItems.moduleId, pathModules.id))
    .where(inArray(pathModules.pathId, pathIds));
  const quizModules = await db
    .selectDistinct({ pathId: pathModules.pathId, moduleId: quizQuestions.moduleId })
    .from(quizQuestions)
    .innerJoin(pathModules, eq(quizQuestions.moduleId, pathModules.id))
    .where(inArray(pathModules.pathId, pathIds));

  const done = items.length
    ? await db
        .select({ m: itemProgress.membershipId, itemId: itemProgress.moduleItemId })
        .from(itemProgress)
        .where(and(
          inArray(itemProgress.membershipId, membershipIds),
          eq(itemProgress.status, 'done'),
          inArray(itemProgress.moduleItemId, items.map((i) => i.itemId)),
        ))
    : [];
  const passed = quizModules.length
    ? await db
        .selectDistinct({ m: quizAttempts.membershipId, moduleId: quizAttempts.moduleId })
        .from(quizAttempts)
        .where(and(
          inArray(quizAttempts.membershipId, membershipIds),
          eq(quizAttempts.passed, true),
          inArray(quizAttempts.moduleId, quizModules.map((q) => q.moduleId)),
        ))
    : [];

  const itemPath = new Map(items.map((i) => [i.itemId, i.pathId]));
  const modulePath = new Map(quizModules.map((q) => [q.moduleId, q.pathId]));
  const count = (pairs: { pathId: string }[], pathId: string) => pairs.filter((p) => p.pathId === pathId).length;

  for (const m of membershipIds) {
    for (const p of pathIds) {
      out.set(progressKey(m, p), { itemsDone: 0, itemsTotal: count(items, p), quizzesPassed: 0, quizzesTotal: count(quizModules, p), percent: 0 });
    }
  }
  for (const d of done) {
    const row = out.get(progressKey(d.m, itemPath.get(d.itemId)!));
    if (row) row.itemsDone++;
  }
  for (const q of passed) {
    const row = out.get(progressKey(q.m, modulePath.get(q.moduleId)!));
    if (row) row.quizzesPassed++;
  }
  for (const row of out.values()) row.percent = pathPercent(row.itemsDone, row.itemsTotal, row.quizzesPassed, row.quizzesTotal);
  return out;
}

/** Stamp the enrollment complete the first time its path reaches 100%. */
export async function refreshCompletion(membershipId: string, pathId: string): Promise<void> {
  const progress = (await progressFor([membershipId], [pathId])).get(progressKey(membershipId, pathId));
  if (progress?.percent !== 100) return;
  await db
    .update(enrollments)
    .set({ completedAt: new Date() })
    .where(and(eq(enrollments.membershipId, membershipId), eq(enrollments.pathId, pathId), isNull(enrollments.completedAt)));
}
