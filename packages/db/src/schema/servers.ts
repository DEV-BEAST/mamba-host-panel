import { pgTable, text, timestamp, uuid, integer, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { nodes } from './nodes';
import { allocations } from './allocations';
import { blueprints } from './blueprints';
import { tenants } from './tenants';

export const serverStatusEnum = pgEnum('server_status', [
  'offline',
  'starting',
  'online',
  'stopping',
  'installing',
  'failed',
]);

export const installStatusEnum = pgEnum('install_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
]);

export const serverLogLevelEnum = pgEnum('server_log_level', [
  'info',
  'warning',
  'error',
  'success',
]);

export const servers = pgTable(
  'servers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),

    // Relationships
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'restrict' }),
    allocationId: uuid('allocation_id').references(() => allocations.id, { onDelete: 'set null' }),
    blueprintId: uuid('blueprint_id').references(() => blueprints.id, { onDelete: 'restrict' }),

    // Container info
    containerId: text('container_id'),
    image: text('image').notNull(),

    // Resource limits
    cpuLimitMillicores: integer('cpu_limit_millicores').notNull(),
    memLimitMb: integer('mem_limit_mb').notNull(),
    diskGb: integer('disk_gb').notNull(),

    // Status
    status: serverStatusEnum('status').notNull().default('offline'),
    installStatus: installStatusEnum('install_status'),
    installLog: text('install_log'),

    // Legacy fields (kept for backwards compatibility during migration)
    port: integer('port'),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('servers_tenant_id_idx').on(table.tenantId),
    nodeIdIdx: index('servers_node_id_idx').on(table.nodeId),
    statusIdx: index('servers_status_idx').on(table.status),
    userIdIdx: index('servers_user_id_idx').on(table.userId),
  })
);

// Server logs table (audit trail for server operations)
export const serverLogs = pgTable(
  'server_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serverId: uuid('server_id')
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    level: serverLogLevelEnum('level').notNull(),
    message: text('message').notNull(),
    timestamp: timestamp('timestamp', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    serverIdIdx: index('server_logs_server_id_idx').on(table.serverId),
    timestampIdx: index('server_logs_timestamp_idx').on(table.timestamp),
  })
);
