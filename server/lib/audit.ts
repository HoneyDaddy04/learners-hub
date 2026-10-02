import { db } from '../db/client.js';
import { auditLog } from '../db/schema.js';

export async function audit(orgId: string | null, actorUserId: string, action: string, targetId?: string, meta: Record<string, unknown> = {}) {
  await db.insert(auditLog).values({ orgId, actorUserId, action, targetId, meta });
}
