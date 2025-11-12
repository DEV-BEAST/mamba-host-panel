import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';

export const wingsNodes = pgTable('wings_nodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  fqdn: text('fqdn').notNull(),
  daemonToken: text('daemon_token').notNull(),
  scheme: text('scheme').notNull().default('http'),
  port: integer('port').notNull().default(8080),
  isOnline: boolean('is_online').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});
