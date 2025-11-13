import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../common/database/database.module';
import { metricsHourly, metricsSamples } from '@mambaPanel/db';
import { eq, and, gte, lte, desc } from '@mambaPanel/db';
import type { Database } from '@mambaPanel/db';
import { ServersService } from '../servers/servers.service';

@Injectable()
export class MetricsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private dbConnection: { db: Database },
    private serversService: ServersService
  ) {}

  /**
   * Get server metrics for a time range
   */
  async getServerMetrics(
    userId: string,
    serverId: string,
    start?: Date,
    end?: Date
  ) {
    // Verify server access
    await this.serversService.findById(userId, serverId);

    const startDate = start || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24h
    const endDate = end || new Date();

    // Query hourly aggregated metrics
    const metrics = await this.dbConnection.db
      .select()
      .from(metricsHourly)
      .where(
        and(
          eq(metricsHourly.serverId, serverId),
          gte(metricsHourly.hourTimestamp, startDate),
          lte(metricsHourly.hourTimestamp, endDate)
        )
      )
      .orderBy(desc(metricsHourly.hourTimestamp))
      .limit(168); // Max 1 week (7 * 24 hours)

    return metrics;
  }

  /**
   * Get current (most recent) server metrics
   */
  async getCurrentMetrics(userId: string, serverId: string) {
    // Verify server access
    await this.serversService.findById(userId, serverId);

    // Get most recent raw sample
    const [sample] = await this.dbConnection.db
      .select()
      .from(metricsSamples)
      .where(eq(metricsSamples.serverId, serverId))
      .orderBy(desc(metricsSamples.timestamp))
      .limit(1);

    if (!sample) {
      return {
        cpuUsagePercent: 0,
        memUsageMb: 0,
        diskUsageMb: 0,
        netEgressBytes: 0,
        uptimeSeconds: 0,
        timestamp: new Date(),
      };
    }

    return sample;
  }
}
