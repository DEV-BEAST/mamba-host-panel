import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../common/database/database.module';
import { auditLogs } from '@mambaPanel/db';
import { eq, desc } from '@mambaPanel/db';
import type { Database } from '@mambaPanel/db';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class AuditService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private dbConnection: { db: Database },
    private tenantsService: TenantsService
  ) {}

  /**
   * Get audit logs for active tenant
   */
  async getLogs(userId: string, limit: number = 50, offset: number = 0) {
    const activeTenantId = await this.tenantsService.getActiveTenantId(userId);

    if (!activeTenantId) {
      return [];
    }

    return this.dbConnection.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, activeTenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
