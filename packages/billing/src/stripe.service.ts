/**
 * Stripe Service
 * Handles Stripe API interactions for billing and subscriptions
 */

import Stripe from 'stripe';

export class StripeService {
  private stripe: Stripe;

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-11-20.acacia',
    } as any);
  }

  // Product Management
  async createProduct(params: { name: string; description?: string }) {
    return this.stripe.products.create({
      name: params.name,
      description: params.description,
    });
  }

  async listProducts() {
    return this.stripe.products.list({ active: true });
  }

  // Price Management
  async createPrice(params: {
    productId: string;
    unitAmount: number;
    currency: string;
    recurring?: { interval: 'month' | 'year' };
    metered?: boolean;
  }) {
    return this.stripe.prices.create({
      product: params.productId,
      unit_amount: params.unitAmount,
      currency: params.currency,
      recurring: params.recurring,
      billing_scheme: params.metered ? 'tiered' : 'per_unit',
    });
  }

  // Customer Management
  async createCustomer(params: { email: string; name?: string; metadata?: Record<string, string> }) {
    return this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    });
  }

  async getCustomer(customerId: string) {
    return this.stripe.customers.retrieve(customerId);
  }

  // Subscription Management
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    quantity?: number;
    metadata?: Record<string, string>;
  }) {
    return this.stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId, quantity: params.quantity || 1 }],
      metadata: params.metadata,
    });
  }

  async getSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd = true) {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: atPeriodEnd,
    });
  }

  async resumeSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  // Usage Reporting (for metered billing)
  async reportUsage(params: {
    subscriptionItemId: string;
    quantity: number;
    timestamp?: number;
    action?: 'increment' | 'set';
  }) {
    return this.stripe.subscriptionItems.createUsageRecord(
      params.subscriptionItemId,
      {
        quantity: params.quantity,
        timestamp: params.timestamp || Math.floor(Date.now() / 1000),
        action: params.action || 'set',
      }
    );
  }

  // Invoice Management
  async listInvoices(customerId: string) {
    return this.stripe.invoices.list({ customer: customerId });
  }

  async getInvoice(invoiceId: string) {
    return this.stripe.invoices.retrieve(invoiceId);
  }

  // Portal Sessions
  async createPortalSession(params: { customerId: string; returnUrl: string }) {
    return this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
  }

  // Webhook Processing
  constructWebhookEvent(payload: string | Buffer, signature: string, secret: string) {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}

export default StripeService;
