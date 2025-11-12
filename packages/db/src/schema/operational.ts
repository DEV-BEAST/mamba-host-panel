import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, unique, index, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const actorTypeEnum = pgEnum('actor_type', ['user', 'system', 'api_key']);
export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'discord', 'web_push']);
export const notificationStatusEnum = pgEnum('notification_status', ['pending', 'sent', 'failed']);

// Audit logs table
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id'),
    actorType: actorTypeEnum('actor_type').notNull(),
    action: text('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: uuid('resource_id'),
    metadata: jsonb('metadata'), // {field: value, oldValue: x, newValue: y}
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('audit_logs_tenant_id_idx').on(table.tenantId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
    actorIdIdx: index('audit_logs_actor_id_idx').on(table.actorId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
  })
);

// Webhook events table
export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    provider: text('provider').notNull(), // 'stripe', 'discord', etc
    eventType: text('event_type').notNull(),
    eventId: text('event_id').notNull(),
    payload: jsonb('payload').notNull(),
    processed: boolean('processed').notNull().default(false),
    processedAt: timestamp('processed_at', { mode: 'date' }),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueProviderEvent: unique('webhook_events_provider_event_unique').on(
      table.provider,
      table.eventId
    ),
    processedIdx: index('webhook_events_processed_idx').on(table.processed),
  })
);

// Notifications table
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    template: text('template').notNull(),
    subject: text('subject'),
    body: text('body').notNull(),
    metadata: jsonb('metadata'), // {serverId, serverName, etc}
    status: notificationStatusEnum('status').notNull().default('pending'),
    sentAt: timestamp('sent_at', { mode: 'date' }),
    readAt: timestamp('read_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    statusIdx: index('notifications_status_idx').on(table.status),
    tenantIdIdx: index('notifications_tenant_id_idx').on(table.tenantId),
  })
);
