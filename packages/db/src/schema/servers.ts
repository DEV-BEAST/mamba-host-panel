import { pgTable, text, timestamp, uuid, integer, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { wingsNodes } from './wings-nodes';

export const serverStatusEnum = pgEnum('server_status', [
  'offline',
  'starting',
  'online',
  'stopping',
  'installing',
  'failed',
]);

export const servers = pgTable('servers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  wingsNodeId: uuid('wings_node_id')
    .notNull()
    .references(() => wingsNodes.id, { onDelete: 'restrict' }),
  containerId: text('container_id'),
  status: serverStatusEnum('status').notNull().default('offline'),
  cpu: integer('cpu').notNull(),
  memory: integer('memory').notNull(),
  disk: integer('disk').notNull(),
  port: integer('port').notNull(),
  image: text('image').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});
