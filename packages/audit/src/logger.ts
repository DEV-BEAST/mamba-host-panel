import type { Database } from '@mambaPanel/db';
import { auditLogs } from '@mambaPanel/db';
import type { AuditLogEntry } from './types';

/**
 * Append-only audit logger
 */
export class AuditLogger {
  constructor(private db: Database) {}

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        tenantId: entry.tenantId,
        actorId: entry.actorId,
        actorType: entry.actorType,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata || {},
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        createdAt: new Date(),
      });
    } catch (error) {
      // Never fail the main operation due to audit logging failure
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Query audit logs (tenant-scoped)
   */
  async query(options: {
    tenantId: string;
    actorId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const {
      tenantId,
      actorId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = options;

    let query = this.db.select().from(auditLogs).$dynamic();

    // Always scope by tenant
    query = query.where((auditLogs, { eq }) => eq(auditLogs.tenantId, tenantId));

    // Add filters
    if (actorId) {
      query = query.where((auditLogs, { eq }) => eq(auditLogs.actorId, actorId));
    }
    if (action) {
      query = query.where((auditLogs, { eq }) => eq(auditLogs.action, action));
    }
    if (resourceType) {
      query = query.where((auditLogs, { eq }) => eq(auditLogs.resourceType, resourceType));
    }
    if (resourceId) {
      query = query.where((auditLogs, { eq }) => eq(auditLogs.resourceId, resourceId));
    }
    if (startDate) {
      query = query.where((auditLogs, { gte }) => gte(auditLogs.createdAt, startDate));
    }
    if (endDate) {
      query = query.where((auditLogs, { lte }) => lte(auditLogs.createdAt, endDate));
    }

    // Order by most recent first
    query = query.orderBy((auditLogs, { desc }) => desc(auditLogs.createdAt));

    // Pagination
    query = query.limit(limit).offset(offset);

    return await query;
  }
}
