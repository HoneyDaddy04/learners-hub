import { Hono } from 'hono';
import { alias } from 'drizzle-orm/pg-core';
import { and, asc, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import type { JobRole, MemberRow } from '../../shared/types.js';
import { db } from '../db/client.js';
import { jobRoles, memberships } from '../db/schema.js';
import { isAdmin, isManagerOrAdmin, requireRole } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { ApiError, badRequest, forbidden, notFound } from '../lib/errors.js';
import { body, idParam } from '../lib/validate.js';

export const members = new Hono();

const manager = alias(memberships, 'manager');

members.get('/', requireRole(isManagerOrAdmin), async (c) => {
  const m = c.get('member');
  const rows: MemberRow[] = await db
    .select({
      id: memberships.id, name: memberships.name, email: memberships.email, role: memberships.role, status: memberships.status,
      department: memberships.department, jobRoleId: memberships.jobRoleId, jobRoleName: jobRoles.name,
      managerId: memberships.managerId, managerName: manager.name,
    })
    .from(memberships)
    .leftJoin(jobRoles, eq(memberships.jobRoleId, jobRoles.id))
    .leftJoin(manager, eq(memberships.managerId, manager.id))
    .where(and(eq(memberships.orgId, m.orgId), ne(memberships.status, 'removed')))
    .orderBy(asc(memberships.name));
  return c.json(rows);
});

const roleSchema = z.enum(['owner', 'admin', 'manager', 'member']);
const optionalId = z.string().uuid().nullable().optional();

async function checkRefs(orgId: string, jobRoleId?: string | null, managerId?: string | null) {
  if (jobRoleId) {
    const [r] = await db.select({ id: jobRoles.id }).from(jobRoles).where(and(eq(jobRoles.id, jobRoleId), eq(jobRoles.orgId, orgId)));
    if (!r) throw badRequest('Unknown job role');
  }
  if (managerId) {
    const [r] = await db.select({ id: memberships.id }).from(memberships).where(and(eq(memberships.id, managerId), eq(memberships.orgId, orgId)));
    if (!r) throw badRequest('Unknown manager');
  }
}

members.post('/', requireRole(isAdmin, 'Only admins can invite people'), async (c) => {
  const m = c.get('member');
  const input = await body(c, z.object({
    email: z.string().trim().toLowerCase().email(),
    name: z.string().trim().min(1).max(80),
    role: roleSchema.default('member'),
    department: z.string().trim().max(80).nullable().optional(),
    jobRoleId: optionalId,
    managerId: optionalId,
  }));
  if (input.role === 'owner' && m.role !== 'owner') throw forbidden('Only the owner can add another owner');
  await checkRefs(m.orgId, input.jobRoleId, input.managerId);

  const [existing] = await db
    .select({ id: memberships.id, status: memberships.status })
    .from(memberships)
    .where(and(eq(memberships.orgId, m.orgId), eq(memberships.email, input.email)));
  if (existing && existing.status !== 'removed') throw new ApiError(409, 'That person is already in your organisation', 'conflict');

  const values = { name: input.name, role: input.role, department: input.department ?? null, jobRoleId: input.jobRoleId ?? null, managerId: input.managerId ?? null };
  const [row] = existing
    ? await db.update(memberships).set({ ...values, status: 'invited', userId: null }).where(eq(memberships.id, existing.id)).returning({ id: memberships.id })
    : await db.insert(memberships).values({ ...values, orgId: m.orgId, email: input.email }).returning({ id: memberships.id });
  await audit(m.orgId, c.get('user').uid, 'member.invited', row.id, { email: input.email, role: input.role });
  return c.json({ id: row.id }, 201);
});

members.patch('/:id', requireRole(isAdmin, 'Only admins can change people'), async (c) => {
  const m = c.get('member');
  const id = idParam(c);
  const input = await body(c, z.object({
    name: z.string().trim().min(1).max(80).optional(),
    role: roleSchema.optional(),
    department: z.string().trim().max(80).nullable().optional(),
    jobRoleId: optionalId,
    managerId: optionalId,
    status: z.literal('removed').optional(),
  }));
  const [target] = await db.select().from(memberships).where(and(eq(memberships.id, id), eq(memberships.orgId, m.orgId)));
  if (!target || target.status === 'removed') throw notFound('Person not found');
  if ((target.role === 'owner' || input.role === 'owner') && m.role !== 'owner') throw forbidden('Only the owner can change an owner');
  if (target.id === m.id && (input.status || (input.role && input.role !== m.role))) throw forbidden('You cannot remove yourself or change your own role');
  if (input.managerId === id) throw badRequest('Someone cannot manage themselves');
  await checkRefs(m.orgId, input.jobRoleId, input.managerId);

  await db.update(memberships).set(input).where(eq(memberships.id, id));
  await audit(m.orgId, c.get('user').uid, input.status === 'removed' ? 'member.removed' : 'member.updated', id, input);
  return c.json({ ok: true });
});

export const roles = new Hono();

roles.get('/', async (c) => {
  const rows: JobRole[] = await db
    .select({ id: jobRoles.id, name: jobRoles.name })
    .from(jobRoles)
    .where(eq(jobRoles.orgId, c.get('member').orgId))
    .orderBy(asc(jobRoles.name));
  return c.json(rows);
});

roles.post('/', requireRole(isAdmin, 'Only admins can add job roles'), async (c) => {
  const m = c.get('member');
  const { name } = await body(c, z.object({ name: z.string().trim().min(1).max(80) }));
  const [row] = await db.insert(jobRoles).values({ orgId: m.orgId, name }).onConflictDoNothing().returning({ id: jobRoles.id, name: jobRoles.name });
  if (!row) throw new ApiError(409, 'That job role already exists', 'conflict');
  return c.json(row, 201);
});
