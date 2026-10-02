import { Hono } from 'hono';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { MeResponse } from '../../shared/types.js';
import { db } from '../db/client.js';
import { memberships, orgs, users } from '../db/schema.js';
import { loadMember, type AuthUser } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { ApiError, badRequest, forbidden } from '../lib/errors.js';
import { body } from '../lib/validate.js';

/** Signed-in routes that work before the person belongs to an org. */
export const me = new Hono();

async function ensureUser(u: AuthUser) {
  await db
    .insert(users)
    .values({ id: u.uid, email: u.email, name: u.name ?? null })
    .onConflictDoUpdate({ target: users.id, set: { email: u.email } });
}

me.get('/', async (c) => {
  const u = c.get('user');
  await ensureUser(u);
  const member = await loadMember(u.uid);
  const [org] = member ? await db.select({ id: orgs.id, name: orgs.name }).from(orgs).where(eq(orgs.id, member.orgId)) : [];
  // Invites are only claimable with a verified email, so only show them then.
  const invites = !member && u.emailVerified
    ? await db
        .select({ membershipId: memberships.id, orgName: orgs.name })
        .from(memberships)
        .innerJoin(orgs, eq(memberships.orgId, orgs.id))
        .where(and(eq(memberships.email, u.email), eq(memberships.status, 'invited'), isNull(memberships.userId)))
    : [];
  const res: MeResponse = {
    user: { email: u.email, name: u.name ?? null, emailVerified: u.emailVerified },
    member,
    org: org ?? null,
    invites,
  };
  return c.json(res);
});

me.post('/join', async (c) => {
  const u = c.get('user');
  const { membershipId } = await body(c, z.object({ membershipId: z.string().uuid() }));
  if (!u.emailVerified) throw forbidden('Verify your email address before joining an organisation');
  if (await loadMember(u.uid)) throw new ApiError(409, 'You already belong to an organisation', 'conflict');
  await ensureUser(u);
  const [row] = await db
    .update(memberships)
    .set({ userId: u.uid, status: 'active' })
    .where(and(eq(memberships.id, membershipId), eq(memberships.email, u.email), eq(memberships.status, 'invited'), isNull(memberships.userId)))
    .returning({ id: memberships.id, orgId: memberships.orgId });
  if (!row) throw badRequest('That invite is no longer available');
  await audit(row.orgId, u.uid, 'member.joined', row.id);
  return c.json({ ok: true });
});

me.post('/org', async (c) => {
  const u = c.get('user');
  const input = await body(c, z.object({ orgName: z.string().trim().min(2).max(80), name: z.string().trim().min(1).max(80) }));
  if (await loadMember(u.uid)) throw new ApiError(409, 'You already belong to an organisation', 'conflict');
  await ensureUser(u);
  const orgId = await db.transaction(async (tx) => {
    const [org] = await tx.insert(orgs).values({ name: input.orgName }).returning({ id: orgs.id });
    await tx.insert(memberships).values({ orgId: org.id, userId: u.uid, email: u.email, name: input.name, role: 'owner', status: 'active' });
    return org.id;
  });
  await audit(orgId, u.uid, 'org.created', orgId);
  return c.json({ orgId }, 201);
});
