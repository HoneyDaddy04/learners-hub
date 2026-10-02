import { createRemoteJWKSet, jwtVerify } from 'jose';
import { and, eq } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import { db } from '../db/client.js';
import { memberships } from '../db/schema.js';
import { forbidden, unauthorized } from './errors.js';

export type Role = 'owner' | 'admin' | 'manager' | 'member';

export interface AuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface Member {
  id: string;
  orgId: string;
  role: Role;
  name: string;
  email: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    member: Member;
  }
}

const PROJECT = process.env.GCP_PROJECT ?? 'learners-hub-app';
// Identity Platform ID tokens are signed by the securetoken service account.
const jwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export async function verifyIdToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://securetoken.google.com/${PROJECT}`,
    audience: PROJECT,
  });
  if (!payload.sub || typeof payload.email !== 'string') throw unauthorized('Token has no subject or email');
  return {
    uid: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === 'string' ? payload.name : undefined,
  };
}

/** Level 1: a valid Identity Platform token. Sets `user`. */
export const requireUser: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) throw unauthorized();
  try {
    c.set('user', await verifyIdToken(token));
  } catch {
    throw unauthorized('Invalid or expired session');
  }
  await next();
};

export async function loadMember(uid: string): Promise<Member | null> {
  const [row] = await db
    .select({ id: memberships.id, orgId: memberships.orgId, role: memberships.role, name: memberships.name, email: memberships.email })
    .from(memberships)
    .where(and(eq(memberships.userId, uid), eq(memberships.status, 'active')))
    .limit(1);
  return row ?? null;
}

/** Level 2: an active membership in an org. Sets `member`. Every query below is scoped by member.orgId. */
export const requireMember: MiddlewareHandler = async (c, next) => {
  const member = await loadMember(c.get('user').uid);
  if (!member) throw forbidden('You are not a member of an organisation yet');
  c.set('member', member);
  await next();
};

export const isAdmin = (m: Member) => m.role === 'owner' || m.role === 'admin';
export const isManagerOrAdmin = (m: Member) => isAdmin(m) || m.role === 'manager';

export function requireRole(check: (m: Member) => boolean, message = 'Not allowed'): MiddlewareHandler {
  return async (c, next) => {
    if (!check(c.get('member'))) throw forbidden(message);
    await next();
  };
}
