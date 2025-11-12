import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Database } from '@gamePanel/db';
import { webhookEvents, subscriptions, invoices } from '@gamePanel/db';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

/**
 * Stripe webhook handler with idempotency and event storage
 */
export async function stripeWebhookHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  db: Database
) {
  const signature = request.headers['stripe-signature'];

  if (!signature) {
    return reply.status(400).send({ error: 'Missing Stripe signature' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      request.body as string,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    request.log.error(`Webhook signature verification failed: ${err.message}`);
    return reply.status(400).send({ error: `Webhook Error: ${err.message}` });
  }

  // Check if event already processed (idempotency)
  const [existingEvent] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.eventId, event.id))
    .limit(1);

  if (existingEvent && existingEvent.processed) {
    request.log.info(`Event ${event.id} already processed, skipping`);
    return reply.send({ received: true, skipped: true });
  }

  // Store event
  if (!existingEvent) {
    await db.insert(webhookEvents).values({
      provider: 'stripe',
      eventType: event.type,
      eventId: event.id,
      payload: event as any,
      processed: false,
      createdAt: new Date(),
    });
  }

  // Process event with retry logic
  try {
    await processStripeEvent(event, db, request.log);

    // Mark as processed
    await db
      .update(webhookEvents)
      .set({ processed: true, processedAt: new Date() })
      .where(eq(webhookEvents.eventId, event.id));

    return reply.send({ received: true });
  } catch (error: any) {
    request.log.error(`Failed to process event ${event.id}:`, error);

    // Update retry count and error
    const retryCount = (existingEvent?.retryCount || 0) + 1;
    await db
      .update(webhookEvents)
      .set({
        retryCount,
        lastError: error.message,
      })
      .where(eq(webhookEvents.eventId, event.id));

    // Return 500 to trigger Stripe retry
    return reply.status(500).send({ error: 'Processing failed' });
  }
}

/**
 * Process individual Stripe events
 */
async function processStripeEvent(
  event: Stripe.Event,
  db: Database,
  logger: any
) {
  logger.info(`Processing Stripe event: ${event.type}`);

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentSucceeded(invoice, db, logger);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice, db, logger);
      break;
    }

    case 'invoice.finalized': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoiceFinalized(invoice, db, logger);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription, db, logger);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription, db, logger);
      break;
    }

    default:
      logger.info(`Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle invoice.payment_succeeded
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  db: Database,
  logger: any
) {
  logger.info(`Invoice ${invoice.id} paid successfully`);

  // Update invoice status
  await db
    .update(invoices)
    .set({
      status: 'paid',
      amountPaid: invoice.amount_paid,
      paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
    })
    .where(eq(invoices.stripeInvoiceId, invoice.id));

  // If tenant was suspended, reactivate
  // TODO: Implement tenant reactivation
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  db: Database,
  logger: any
) {
  logger.warn(`Invoice ${invoice.id} payment failed`);

  // Update invoice status
  await db
    .update(invoices)
    .set({
      status: 'failed',
    })
    .where(eq(invoices.stripeInvoiceId, invoice.id));

  // Send notification to tenant
  // TODO: Implement notification

  // If multiple failures, suspend tenant
  // TODO: Implement suspension logic
}

/**
 * Handle invoice.finalized - report usage
 */
async function handleInvoiceFinalized(
  invoice: Stripe.Invoice,
  db: Database,
  logger: any
) {
  logger.info(`Invoice ${invoice.id} finalized, reporting usage`);

  // Query usage records for this period
  // Report to Stripe
  // TODO: Implement usage reporting
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  db: Database,
  logger: any
) {
  logger.info(`Subscription ${subscription.id} updated`);

  // Find tenant by Stripe customer ID
  const [existingSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (existingSub) {
    // Update existing subscription
    await db
      .update(subscriptions)
      .set({
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAt: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : null,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSub.id));
  }
  // Note: Creation is handled by API when user subscribes
}

/**
 * Handle subscription deleted/canceled
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  db: Database,
  logger: any
) {
  logger.info(`Subscription ${subscription.id} canceled`);

  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  // Suspend tenant servers
  // TODO: Implement suspension
}
