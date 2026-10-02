import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { catalogItems, moduleItems, pathModules, paths, quizQuestions, sourcingCache } from '../db/schema.js';
import { cacheKey, sourcePath, type DraftPath, type Progress, type SourcingInput } from './sourcing.js';

/** Reuse an earlier sourcing run for the same role, context and sources; the AI run costs minutes and quota. */
export async function sourceWithCache(input: SourcingInput, onStep: Progress): Promise<DraftPath> {
  const key = cacheKey(input);
  const [hit] = await db.select().from(sourcingCache).where(eq(sourcingCache.key, key)).limit(1);
  if (hit) {
    onStep(3, 'Reusing a recent search for this role');
    return hit.draft as DraftPath;
  }
  const draft = await sourcePath(input, onStep);
  if (draft.modules.length > 0) {
    await db.insert(sourcingCache).values({ key, draft }).onConflictDoUpdate({ target: sourcingCache.key, set: { draft, createdAt: new Date() } });
  }
  return draft;
}

/** Store an AI draft as a draft path. Nothing is visible to staff until an admin publishes it. */
export async function saveDraft(draft: DraftPath, orgId: string, createdBy: string, input: SourcingInput): Promise<string> {
  return db.transaction(async (tx) => {
    const [path] = await tx
      .insert(paths)
      .values({ orgId, title: draft.title, roleName: input.role.trim(), description: draft.description, level: draft.level, context: input.context?.trim() || null, createdBy })
      .returning({ id: paths.id });

    for (const [mi, m] of draft.modules.entries()) {
      const [mod] = await tx.insert(pathModules).values({ pathId: path.id, position: mi, title: m.title, summary: m.summary }).returning({ id: pathModules.id });
      for (const [ii, it] of m.items.entries()) {
        const [cat] = await tx
          .insert(catalogItems)
          .values({
            source: it.source, externalId: it.externalId ?? null, url: it.url, title: it.title, provider: it.provider,
            format: it.format, durationSec: it.durationSec ?? null, thumbnailUrl: it.thumbnailUrl ?? null, checkedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: catalogItems.url,
            set: { title: it.title, durationSec: it.durationSec ?? null, thumbnailUrl: it.thumbnailUrl ?? null, broken: false, checkedAt: new Date() },
          })
          .returning({ id: catalogItems.id });
        await tx.insert(moduleItems).values({ moduleId: mod.id, position: ii, catalogItemId: cat.id, why: it.why });
      }
      if (m.quiz.length > 0) {
        await tx.insert(quizQuestions).values(m.quiz.map((q, qi) => ({ moduleId: mod.id, position: qi, prompt: q.prompt, options: q.options, correctIndex: q.correctIndex })));
      }
    }
    return path.id;
  });
}
