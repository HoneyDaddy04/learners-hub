import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const memberRole = pgEnum('member_role', ['owner', 'admin', 'manager', 'member']);
export const memberStatus = pgEnum('member_status', ['invited', 'active', 'removed']);
export const itemSource = pgEnum('item_source', ['youtube', 'web']);
export const itemFormat = pgEnum('item_format', ['video', 'course', 'article']);
export const pathStatus = pgEnum('path_status', ['draft', 'published', 'archived']);
export const enrollmentSource = pgEnum('enrollment_source', ['self', 'assigned', 'goal']);
export const progressStatus = pgEnum('progress_status', ['in_progress', 'done']);

/** One row per signed-in identity. id = Identity Platform uid. */
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: createdAt(),
});

export const orgs = pgTable('orgs', {
  id: id(),
  name: text('name').notNull(),
  createdAt: createdAt(),
});

export const jobRoles = pgTable(
  'job_roles',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => orgs.id),
    name: text('name').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('job_roles_org_name_uq').on(t.orgId, t.name)],
);

/**
 * A person in an org. Invited members have no userId until they sign in with
 * a verified email matching `email`.
 */
export const memberships = pgTable(
  'memberships',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => orgs.id),
    userId: text('user_id').references(() => users.id),
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: memberRole('role').notNull().default('member'),
    status: memberStatus('status').notNull().default('invited'),
    department: text('department'),
    jobRoleId: uuid('job_role_id').references(() => jobRoles.id),
    managerId: uuid('manager_id'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('memberships_org_email_uq').on(t.orgId, t.email),
    index('memberships_user_idx').on(t.userId),
  ],
);

/** Global, de-duplicated learning content (shared across orgs). */
export const catalogItems = pgTable(
  'catalog_items',
  {
    id: id(),
    source: itemSource('source').notNull(),
    externalId: text('external_id'), // YouTube video id
    url: text('url').notNull(),
    title: text('title').notNull(),
    provider: text('provider').notNull(),
    format: itemFormat('format').notNull(),
    durationSec: integer('duration_sec'),
    thumbnailUrl: text('thumbnail_url'),
    broken: boolean('broken').notNull().default(false),
    checkedAt: timestamp('checked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('catalog_items_url_uq').on(t.url)],
);

export const paths = pgTable(
  'paths',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => orgs.id),
    title: text('title').notNull(),
    roleName: text('role_name').notNull(),
    description: text('description'),
    level: text('level'),
    status: pathStatus('status').notNull().default('draft'),
    context: text('context'),
    createdBy: uuid('created_by').references(() => memberships.id),
    approvedBy: uuid('approved_by').references(() => memberships.id),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('paths_org_status_idx').on(t.orgId, t.status)],
);

export const pathModules = pgTable('path_modules', {
  id: id(),
  pathId: uuid('path_id').notNull().references(() => paths.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
});

export const moduleItems = pgTable('module_items', {
  id: id(),
  moduleId: uuid('module_id').notNull().references(() => pathModules.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  catalogItemId: uuid('catalog_item_id').notNull().references(() => catalogItems.id),
  why: text('why'),
});

/** 3-question module check. AI drafts; approved with the path. */
export const quizQuestions = pgTable('quiz_questions', {
  id: id(),
  moduleId: uuid('module_id').notNull().references(() => pathModules.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  prompt: text('prompt').notNull(),
  options: jsonb('options').$type<string[]>().notNull(),
  correctIndex: integer('correct_index').notNull(),
});

export const enrollments = pgTable(
  'enrollments',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => orgs.id),
    membershipId: uuid('membership_id').notNull().references(() => memberships.id),
    pathId: uuid('path_id').notNull().references(() => paths.id, { onDelete: 'cascade' }),
    source: enrollmentSource('source').notNull().default('self'),
    assignedBy: uuid('assigned_by').references(() => memberships.id),
    dueDate: date('due_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('enrollments_member_path_uq').on(t.membershipId, t.pathId)],
);

/** Per-person progress on a module item. watchedSec only grows from server-checked heartbeats. */
export const itemProgress = pgTable(
  'item_progress',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => orgs.id),
    membershipId: uuid('membership_id').notNull().references(() => memberships.id),
    moduleItemId: uuid('module_item_id').notNull().references(() => moduleItems.id, { onDelete: 'cascade' }),
    status: progressStatus('status').notNull().default('in_progress'),
    watchedSec: integer('watched_sec').notNull().default(0),
    lastPositionSec: integer('last_position_sec').notNull().default(0),
    lastBeatAt: timestamp('last_beat_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('item_progress_member_item_uq').on(t.membershipId, t.moduleItemId)],
);

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: id(),
    orgId: uuid('org_id').notNull().references(() => orgs.id),
    membershipId: uuid('membership_id').notNull().references(() => memberships.id),
    moduleId: uuid('module_id').notNull().references(() => pathModules.id, { onDelete: 'cascade' }),
    answers: jsonb('answers').$type<number[]>().notNull(),
    score: integer('score').notNull(),
    passed: boolean('passed').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('quiz_attempts_member_module_idx').on(t.membershipId, t.moduleId)],
);

/** Cache of AI sourcing results per normalised role, reused across orgs. */
export const sourcingCache = pgTable('sourcing_cache', {
  key: text('key').primaryKey(),
  draft: jsonb('draft').notNull(),
  createdAt: createdAt(),
});

export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    orgId: uuid('org_id').references(() => orgs.id),
    actorUserId: text('actor_user_id'),
    action: text('action').notNull(),
    targetId: text('target_id'),
    meta: jsonb('meta').default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [index('audit_log_org_idx').on(t.orgId)],
);
