import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../common/database/database.module';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { nodes, metricsSamples, auditLogs } from '@mambaPanel/db';
import { eq } from '@mambaPanel/db';
import type { Database } from '@mambaPanel/db';
import type Redis from 'ioredis';

@Injectable()
export class NodesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private dbConnection: { db: Database },
    @Inject(REDIS_CLIENT)
    private redis: Redis
  ) {}

  /**
   * Get all nodes
   */
  async findAll() {
    return this.dbConnection.db.select().from(nodes);
  }

  /**
   * Get node by ID
   */
  async findById(id: string) {
    const [node] = await this.dbConnection.db
      .select()
      .from(nodes)
      .where(eq(nodes.id, id))
      .limit(1);

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    return node;
  }

  /**
   * Record node heartbeat
   */
  async recordHeartbeat(nodeId: string, data: any) {
    // Update last heartbeat in Redis (fast)
    await this.redis.set(
      `node:${nodeId}:heartbeat`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        data,
      }),
      'EX',
      300 // Expire after 5 minutes
    );

    // Update node status in database
    await this.dbConnection.db
      .update(nodes)
      .set({
        status: 'online',
        lastHeartbeat: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(nodes.id, nodeId));

    return { success: true };
  }

  /**
   * Record server metrics from Wings
   */
  async recordMetrics(nodeId: string, data: { samples: any[] }) {
    const { samples } = data;

    if (!samples || samples.length === 0) {
      return { success: true, recorded: 0 };
    }

    // Insert metrics into raw_metrics_samples table
    await this.dbConnection.db.insert(metricsSamples).values(
      samples.map((sample) => ({
        serverId: sample.serverId,
        timestamp: new Date(sample.timestamp),
        cpuUsagePercent: sample.cpuUsagePercent,
        memUsageMb: sample.memUsageMb,
        diskUsageMb: sample.diskUsageMb,
        netEgressBytes: sample.netEgressBytes,
        uptimeSeconds: sample.uptimeSeconds,
      }))
    );

    return { success: true, recorded: samples.length };
  }

  /**
   * Record server events from Wings
   */
  async recordEvents(nodeId: string, data: { events: any[] }) {
    const { events } = data;

    if (!events || events.length === 0) {
      return { success: true, recorded: 0 };
    }

    // Insert events into audit logs
    await this.dbConnection.db.insert(auditLogs).values(
      events.map((event) => ({
        tenantId: null, // System events
        actorType: 'system' as const,
        actorId: nodeId,
        action: event.action,
        resourceType: 'server',
        resourceId: event.serverId,
        metadata: event.metadata || {},
        createdAt: new Date(event.timestamp),
      }))
    );

    return { success: true, recorded: events.length };
  }
}
