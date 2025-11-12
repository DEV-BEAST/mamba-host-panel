import { pgTable, text, timestamp, uuid, bigint, pgEnum, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const backupStatusEnum = pgEnum('backup_status', ['pending', 'in_progress', 'completed', 'failed']);
export const backupTypeEnum = pgEnum('backup_type', ['manual', 'scheduled', 'pre_update']);

// Backups table
export const backups = pgTable(
  'backups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serverId: uuid('server_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    status: backupStatusEnum('status').notNull().default('pending'),
    storagePath: text('storage_path'),
    backupType: backupTypeEnum('backup_type').notNull().default('manual'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'date' }),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
  },
  (table) => ({
    serverIdIdx: index('backups_server_id_idx').on(table.serverId),
    tenantIdIdx: index('backups_tenant_id_idx').on(table.tenantId),
    statusIdx: index('backups_status_idx').on(table.status),
  })
);
