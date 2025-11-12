import { pgTable, text, timestamp, uuid, integer, boolean, pgEnum, index } from 'drizzle-orm/pg-core';

export const nodeStatusEnum = pgEnum('node_status', ['online', 'offline', 'maintenance']);

// Nodes table (enhanced wings_nodes)
export const nodes = pgTable(
  'nodes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    fqdn: text('fqdn').notNull(),
    location: text('location'),
    capacityCpuMillicores: integer('capacity_cpu_millicores').notNull(),
    capacityMemMb: integer('capacity_mem_mb').notNull(),
    capacityDiskGb: integer('capacity_disk_gb').notNull(),
    status: nodeStatusEnum('status').notNull().default('offline'),
    lastHeartbeat: timestamp('last_heartbeat', { mode: 'date' }),
    certFingerprint: text('cert_fingerprint'),
    daemonToken: text('daemon_token').notNull(),
    scheme: text('scheme').notNull().default('https'),
    port: integer('port').notNull().default(8080),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('nodes_status_idx').on(table.status),
    lastHeartbeatIdx: index('nodes_last_heartbeat_idx').on(table.lastHeartbeat),
  })
);
