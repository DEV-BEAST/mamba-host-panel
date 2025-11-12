import { pgTable, text, timestamp, uuid, boolean, unique, index } from 'drizzle-orm/pg-core';
import { tenantMembers } from './tenants';

// Roles table
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description'),
    systemRole: boolean('system_role').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index('roles_name_idx').on(table.name),
  })
);

// Permissions table
export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: text('key').notNull().unique(),
    resource: text('resource').notNull(),
    action: text('action').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    keyIdx: index('permissions_key_idx').on(table.key),
    resourceIdx: index('permissions_resource_idx').on(table.resource),
  })
);

// Role permissions table (many-to-many)
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueRolePermission: unique('role_permissions_role_permission_unique').on(
      table.roleId,
      table.permissionId
    ),
    roleIdIdx: index('role_permissions_role_id_idx').on(table.roleId),
  })
);

// Role bindings table (for custom role assignments to tenant members)
export const roleBindings = pgTable(
  'role_bindings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantMemberId: uuid('tenant_member_id')
      .notNull()
      .references(() => tenantMembers.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantMemberIdIdx: index('role_bindings_tenant_member_id_idx').on(table.tenantMemberId),
    roleIdIdx: index('role_bindings_role_id_idx').on(table.roleId),
  })
);
