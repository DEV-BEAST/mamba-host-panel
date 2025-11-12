import { pgTable, text, timestamp, uuid, boolean, pgEnum, unique, index, jsonb, integer } from 'drizzle-orm/pg-core';
import { nodes } from './nodes';

export const portProtocolEnum = pgEnum('port_protocol', ['tcp', 'udp']);
export const allocationStatusEnum = pgEnum('allocation_status', ['allocated', 'released']);

// IP pools table
export const ipPools = pgTable(
  'ip_pools',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    ipAddress: text('ip_address').notNull(),
    isAllocated: boolean('is_allocated').notNull().default(false),
    allocatedToServerId: uuid('allocated_to_server_id'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueNodeIp: unique('ip_pools_node_ip_unique').on(table.nodeId, table.ipAddress),
    isAllocatedIdx: index('ip_pools_is_allocated_idx').on(table.isAllocated),
    nodeIdIdx: index('ip_pools_node_id_idx').on(table.nodeId),
  })
);

// Port pools table
export const portPools = pgTable(
  'port_pools',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    port: integer('port').notNull(),
    protocol: portProtocolEnum('protocol').notNull().default('tcp'),
    isAllocated: boolean('is_allocated').notNull().default(false),
    allocatedToServerId: uuid('allocated_to_server_id'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueNodePortProtocol: unique('port_pools_node_port_protocol_unique').on(
      table.nodeId,
      table.port,
      table.protocol
    ),
    isAllocatedIdx: index('port_pools_is_allocated_idx').on(table.isAllocated),
    nodeIdIdx: index('port_pools_node_id_idx').on(table.nodeId),
  })
);

// Allocations table
export const allocations = pgTable(
  'allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serverId: uuid('server_id').notNull().unique(),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'restrict' }),
    ipAddress: text('ip_address').notNull(),
    ports: jsonb('ports').notNull(), // [{port: number, protocol: 'tcp'|'udp'}]
    status: allocationStatusEnum('status').notNull().default('allocated'),
    allocatedAt: timestamp('allocated_at', { mode: 'date' }).notNull().defaultNow(),
    releasedAt: timestamp('released_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    serverIdIdx: index('allocations_server_id_idx').on(table.serverId),
    nodeIdIdx: index('allocations_node_id_idx').on(table.nodeId),
    statusIdx: index('allocations_status_idx').on(table.status),
  })
);
