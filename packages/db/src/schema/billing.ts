import { pgTable, text, timestamp, uuid, integer, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'trialing',
  'unpaid',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'open',
  'paid',
  'uncollectible',
  'void',
]);

// Products table
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stripeProductId: text('stripe_product_id').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    stripeProductIdIdx: index('products_stripe_product_id_idx').on(table.stripeProductId),
  })
);

// Prices table
export const prices = pgTable(
  'prices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    stripePriceId: text('stripe_price_id').notNull().unique(),
    amount: integer('amount').notNull(), // in cents
    currency: text('currency').notNull().default('usd'),
    billingPeriod: text('billing_period'), // 'month', 'year', etc
    metered: boolean('metered').notNull().default(false),
    usageType: text('usage_type'), // 'metered', 'licensed'
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    stripePriceIdIdx: index('prices_stripe_price_id_idx').on(table.stripePriceId),
    productIdIdx: index('prices_product_id_idx').on(table.productId),
  })
);

// Subscriptions table
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    status: subscriptionStatusEnum('status').notNull(),
    currentPeriodStart: timestamp('current_period_start', { mode: 'date' }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { mode: 'date' }).notNull(),
    cancelAt: timestamp('cancel_at', { mode: 'date' }),
    canceledAt: timestamp('canceled_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('subscriptions_tenant_id_idx').on(table.tenantId),
    statusIdx: index('subscriptions_status_idx').on(table.status),
    stripeSubscriptionIdIdx: index('subscriptions_stripe_subscription_id_idx').on(
      table.stripeSubscriptionId
    ),
  })
);

// Subscription items table
export const subscriptionItems = pgTable(
  'subscription_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    stripeSubscriptionItemId: text('stripe_subscription_item_id').notNull().unique(),
    priceId: uuid('price_id')
      .notNull()
      .references(() => prices.id, { onDelete: 'restrict' }),
    quantity: integer('quantity'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    subscriptionIdIdx: index('subscription_items_subscription_id_idx').on(table.subscriptionId),
    stripeSubscriptionItemIdIdx: index('subscription_items_stripe_subscription_item_id_idx').on(
      table.stripeSubscriptionItemId
    ),
  })
);

// Usage records table
export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    subscriptionItemId: uuid('subscription_item_id')
      .notNull()
      .references(() => subscriptionItems.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    serverId: uuid('server_id'),
    metricType: text('metric_type').notNull(), // 'ram_mb_hours', 'cpu_millicore_hours', etc
    quantity: integer('quantity').notNull(),
    periodStart: timestamp('period_start', { mode: 'date' }).notNull(),
    periodEnd: timestamp('period_end', { mode: 'date' }).notNull(),
    stripeUsageRecordId: text('stripe_usage_record_id'),
    reportedAt: timestamp('reported_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('usage_records_tenant_id_idx').on(table.tenantId),
    periodStartIdx: index('usage_records_period_start_idx').on(table.periodStart),
    subscriptionItemIdIdx: index('usage_records_subscription_item_id_idx').on(
      table.subscriptionItemId
    ),
  })
);

// Invoices table
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, {
      onDelete: 'set null',
    }),
    stripeInvoiceId: text('stripe_invoice_id').notNull().unique(),
    amountDue: integer('amount_due').notNull(),
    amountPaid: integer('amount_paid').notNull(),
    currency: text('currency').notNull().default('usd'),
    status: invoiceStatusEnum('status').notNull(),
    invoicePdf: text('invoice_pdf'),
    hostedInvoiceUrl: text('hosted_invoice_url'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    dueDate: timestamp('due_date', { mode: 'date' }),
    paidAt: timestamp('paid_at', { mode: 'date' }),
  },
  (table) => ({
    tenantIdIdx: index('invoices_tenant_id_idx').on(table.tenantId),
    stripeInvoiceIdIdx: index('invoices_stripe_invoice_id_idx').on(table.stripeInvoiceId),
  })
);

// Credits table
export const credits = pgTable(
  'credits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(), // in cents
    currency: text('currency').notNull().default('usd'),
    description: text('description'),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    usedAt: timestamp('used_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('credits_tenant_id_idx').on(table.tenantId),
  })
);
