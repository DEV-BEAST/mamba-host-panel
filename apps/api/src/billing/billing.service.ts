import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../common/database/database.module';
import { products, subscriptions, invoices } from '@mambaPanel/db';
import { eq, desc } from 'drizzle-orm';
import type { Database } from '@mambaPanel/db';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class BillingService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private dbConnection: { db: Database },
    private tenantsService: TenantsService
  ) {}

  /**
   * Get available products
   */
  async getProducts() {
    return this.dbConnection.db
      .select()
      .from(products)
      .where(eq(products.active, true));
  }

  /**
   * Get tenant subscriptions
   */
  async getSubscriptions(userId: string) {
    const activeTenantId = await this.tenantsService.getActiveTenantId(userId);

    if (!activeTenantId) {
      return [];
    }

    return this.dbConnection.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, activeTenantId))
      .orderBy(desc(subscriptions.createdAt));
  }

  /**
   * Get tenant invoices
   */
  async getInvoices(userId: string) {
    const activeTenantId = await this.tenantsService.getActiveTenantId(userId);

    if (!activeTenantId) {
      return [];
    }

    return this.dbConnection.db
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, activeTenantId))
      .orderBy(desc(invoices.createdAt))
      .limit(50);
  }

  /**
   * Create Stripe billing portal session
   */
  async createPortalSession(userId: string) {
    const activeTenantId = await this.tenantsService.getActiveTenantId(userId);

    if (!activeTenantId) {
      throw new BadRequestException('No active tenant');
    }

    // TODO: Create Stripe portal session
    return {
      url: 'https://billing.stripe.com/session/placeholder',
    };
  }
}
