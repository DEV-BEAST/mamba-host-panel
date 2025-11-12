import { pgTable, timestamp, uuid, integer, unique, index, real } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { nodes } from './nodes';

// Metrics hourly table
export const metricsHourly = pgTable(
  'metrics_hourly',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serverId: uuid('server_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    hourTimestamp: timestamp('hour_timestamp', { mode: 'date' }).notNull(),
    cpuMillicoreAvg: integer('cpu_millicore_avg').notNull(),
    memMbAvg: integer('mem_mb_avg').notNull(),
    diskGbUsed: real('disk_gb_used').notNull(),
    egressMbTotal: integer('egress_mb_total').notNull(),
    samplesCount: integer('samples_count').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueServerHour: unique('metrics_hourly_server_hour_unique').on(
      table.serverId,
      table.hourTimestamp
    ),
    tenantIdIdx: index('metrics_hourly_tenant_id_idx').on(table.tenantId),
    hourTimestampIdx: index('metrics_hourly_hour_timestamp_idx').on(table.hourTimestamp),
    serverIdIdx: index('metrics_hourly_server_id_idx').on(table.serverId),
  })
);
