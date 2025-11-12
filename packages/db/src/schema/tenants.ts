import { pgTable, text, timestamp, uuid, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const planTierEnum = pgEnum('plan_tier', ['free', 'starter', 'pro', 'enterprise']);
export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'suspended', 'canceled']);
export const tenantMemberRoleEnum = pgEnum('tenant_member_role', ['owner', 'admin', 'support', 'member']);

// Tenants table
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    planTier: planTierEnum('plan_tier').notNull().default('free'),
    status: tenantStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index('tenants_slug_idx').on(table.slug),
    statusIdx: index('tenants_status_idx').on(table.status),
  })
);

// Tenant members table
export const tenantMembers = pgTable(
  'tenant_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: tenantMemberRoleEnum('role').notNull().default('member'),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { mode: 'date' }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueTenantUser: unique('tenant_members_tenant_user_unique').on(table.tenantId, table.userId),
    tenantIdIdx: index('tenant_members_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('tenant_members_user_id_idx').on(table.userId),
  })
);
