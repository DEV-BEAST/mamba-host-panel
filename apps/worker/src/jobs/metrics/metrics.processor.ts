import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectDrizzle } from '../../common/database/database.module';
import type { NodeDatabase } from '@mambaPanel/db';
import {
  metricsSamples,
  metricsHourly,
  usageRecords,
  servers,
  tenants,
  subscriptions,
  eq,
  and,
  gte,
  lte,
  sql,
} from '@mambaPanel/db';

/**
 * Metrics and Billing Job Processor
 *
 * Handles metrics aggregation and usage reporting:
 * - aggregate-metrics: Aggregate raw metrics into hourly summaries
 * - report-usage: Report usage to billing system (Stripe)
 */

export interface AggregateMetricsJobData {
  startTime: Date;
  endTime: Date;
}

export interface ReportUsageJobData {
  tenantId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}

@Processor('metrics')
export class MetricsProcessor extends WorkerHost {
  private readonly logger = new Logger(MetricsProcessor.name);

  constructor(@InjectDrizzle() private readonly db: NodeDatabase) {
    super();
  }

  async process(job: Job<AggregateMetricsJobData | ReportUsageJobData>) {
    const { name, data } = job;

    switch (name) {
      case 'aggregate-metrics':
        return this.aggregateMetrics(job as Job<AggregateMetricsJobData>);
      case 'report-usage':
        return this.reportUsage(job as Job<ReportUsageJobData>);
      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  }

  /**
   * Aggregate raw metrics into hourly summaries
   *
   * Flow:
   * 1. Query raw metrics samples for the specified time window
   * 2. Group by server and calculate aggregates (avg CPU, avg memory, total egress)
   * 3. Insert aggregated data into metrics_hourly table
   * 4. Delete or archive processed raw samples
   */
  private async aggregateMetrics(job: Job<AggregateMetricsJobData>) {
    const { startTime, endTime } = job.data;

    this.logger.log(`Aggregating metrics from ${startTime.toISOString()} to ${endTime.toISOString()}`);

    try {
      await job.updateProgress(10);

      // Step 1: Query raw metrics samples
      const samples = await this.db
        .select()
        .from(metricsSamples)
        .where(
          and(
            gte(metricsSamples.timestamp, startTime),
            lte(metricsSamples.timestamp, endTime)
          )
        );

      this.logger.log(`Found ${samples.length} raw samples to aggregate`);

      if (samples.length === 0) {
        this.logger.log('No samples to aggregate');
        return { success: true, recordsAggregated: 0, recordsDeleted: 0 };
      }

      await job.updateProgress(30);

      // Step 2: Group by server and calculate aggregates
      const aggregatedByServer = new Map<
        string,
        {
          serverId: string;
          cpuUsages: number[];
          memUsages: number[];
          diskUsages: number[];
          netEgressBytes: number;
          sampleCount: number;
        }
      >();

      for (const sample of samples) {
        if (!aggregatedByServer.has(sample.serverId)) {
          aggregatedByServer.set(sample.serverId, {
            serverId: sample.serverId,
            cpuUsages: [],
            memUsages: [],
            diskUsages: [],
            netEgressBytes: 0,
            sampleCount: 0,
          });
        }

        const agg = aggregatedByServer.get(sample.serverId)!;
        agg.cpuUsages.push(sample.cpuUsagePercent);
        agg.memUsages.push(sample.memUsageMb);
        agg.diskUsages.push(sample.diskUsageMb);
        agg.netEgressBytes += sample.netEgressBytes;
        agg.sampleCount++;
      }

      await job.updateProgress(50);

      // Step 3: Insert aggregated data
      const hourlyRecords = [];
      for (const [serverId, agg] of aggregatedByServer.entries()) {
        const avgCpu = agg.cpuUsages.reduce((a, b) => a + b, 0) / agg.cpuUsages.length;
        const avgMem = agg.memUsages.reduce((a, b) => a + b, 0) / agg.memUsages.length;
        const avgDisk = agg.diskUsages.reduce((a, b) => a + b, 0) / agg.diskUsages.length;

        hourlyRecords.push({
          serverId,
          timestamp: startTime,
          avgCpuPercent: Math.round(avgCpu * 100) / 100,
          avgMemMb: Math.round(avgMem),
          avgDiskMb: Math.round(avgDisk),
          totalEgressMb: Math.round(agg.netEgressBytes / 1024 / 1024),
          sampleCount: agg.sampleCount,
        });
      }

      await this.db.insert(metricsHourly).values(hourlyRecords);

      this.logger.log(`Inserted ${hourlyRecords.length} hourly aggregates`);

      await job.updateProgress(70);

      // Step 4: Delete processed raw samples
      const deleteResult = await this.db
        .delete(metricsSamples)
        .where(
          and(
            gte(metricsSamples.timestamp, startTime),
            lte(metricsSamples.timestamp, endTime)
          )
        );

      this.logger.log(`Deleted ${samples.length} raw samples`);

      await job.updateProgress(100);

      return {
        success: true,
        recordsAggregated: hourlyRecords.length,
        recordsDeleted: samples.length,
        timeWindow: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to aggregate metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Report usage to billing system (Stripe)
   *
   * Flow:
   * 1. Query aggregated metrics for the billing period
   * 2. Calculate usage per meter (CPU hours, Memory GB-hours, Egress GB)
   * 3. Report usage to Stripe using their metering API
   * 4. Record usage in usage_records table
   * 5. Mark subscription as billed for the period
   */
  private async reportUsage(job: Job<ReportUsageJobData>) {
    const { tenantId, billingPeriodStart, billingPeriodEnd } = job.data;

    this.logger.log(
      `Reporting usage for tenant ${tenantId} from ${billingPeriodStart.toISOString()} to ${billingPeriodEnd.toISOString()}`
    );

    try {
      await job.updateProgress(10);

      // Step 1: Fetch tenant and subscription
      const [tenant] = await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      const [subscription] = await this.db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active')
          )
        )
        .limit(1);

      if (!subscription) {
        this.logger.warn(`No active subscription for tenant ${tenantId}, skipping usage reporting`);
        return { success: true, usageReported: 0 };
      }

      await job.updateProgress(20);

      // Step 2: Get all tenant servers
      const tenantServers = await this.db
        .select()
        .from(servers)
        .where(eq(servers.tenantId, tenantId));

      if (tenantServers.length === 0) {
        this.logger.log(`No servers for tenant ${tenantId}`);
        return { success: true, usageReported: 0 };
      }

      const serverIds = tenantServers.map(s => s.id);

      await job.updateProgress(30);

      // Step 3: Query aggregated metrics for billing period
      const metrics = await this.db
        .select()
        .from(metricsHourly)
        .where(
          and(
            sql`${metricsHourly.serverId} = ANY(${serverIds})`,
            gte(metricsHourly.timestamp, billingPeriodStart),
            lte(metricsHourly.timestamp, billingPeriodEnd)
          )
        );

      this.logger.log(`Found ${metrics.length} hourly metrics records for billing period`);

      await job.updateProgress(50);

      // Step 4: Calculate usage per meter
      let totalCpuHours = 0;
      let totalMemGbHours = 0;
      let totalEgressGb = 0;

      for (const metric of metrics) {
        // Each metric is for 1 hour
        totalCpuHours += metric.avgCpuPercent / 100; // Convert percentage to fractional
        totalMemGbHours += metric.avgMemMb / 1024; // Convert MB to GB
        totalEgressGb += metric.totalEgressMb / 1024; // Convert MB to GB
      }

      // Round to 2 decimal places
      totalCpuHours = Math.round(totalCpuHours * 100) / 100;
      totalMemGbHours = Math.round(totalMemGbHours * 100) / 100;
      totalEgressGb = Math.round(totalEgressGb * 100) / 100;

      this.logger.log(
        `Calculated usage: CPU=${totalCpuHours}h, Memory=${totalMemGbHours}GB-h, Egress=${totalEgressGb}GB`
      );

      await job.updateProgress(70);

      // Step 5: Report to Stripe (simulated)
      // TODO: Implement actual Stripe API calls
      // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      // await stripe.subscriptionItems.createUsageRecord(
      //   subscription.stripeSubscriptionItemId,
      //   {
      //     quantity: Math.round(totalCpuHours),
      //     timestamp: Math.floor(billingPeriodEnd.getTime() / 1000),
      //     action: 'set',
      //   }
      // );

      this.logger.log(`[SIMULATED] Reporting usage to Stripe for subscription ${subscription.stripeSubscriptionId}`);

      await job.updateProgress(85);

      // Step 6: Record usage in database
      const usageRecordIds = [];

      // Create usage record for CPU
      if (totalCpuHours > 0) {
        const [cpuRecord] = await this.db
          .insert(usageRecords)
          .values({
            subscriptionId: subscription.id,
            meterId: 'cpu-hours',
            quantity: totalCpuHours,
            unit: 'hours',
            periodStart: billingPeriodStart,
            periodEnd: billingPeriodEnd,
            reportedAt: new Date(),
            stripeUsageRecordId: `simulated-cpu-${Date.now()}`,
          })
          .returning();

        usageRecordIds.push(cpuRecord.id);
      }

      // Create usage record for Memory
      if (totalMemGbHours > 0) {
        const [memRecord] = await this.db
          .insert(usageRecords)
          .values({
            subscriptionId: subscription.id,
            meterId: 'memory-gb-hours',
            quantity: totalMemGbHours,
            unit: 'gb-hours',
            periodStart: billingPeriodStart,
            periodEnd: billingPeriodEnd,
            reportedAt: new Date(),
            stripeUsageRecordId: `simulated-mem-${Date.now()}`,
          })
          .returning();

        usageRecordIds.push(memRecord.id);
      }

      // Create usage record for Egress
      if (totalEgressGb > 0) {
        const [egressRecord] = await this.db
          .insert(usageRecords)
          .values({
            subscriptionId: subscription.id,
            meterId: 'egress-gb',
            quantity: totalEgressGb,
            unit: 'gb',
            periodStart: billingPeriodStart,
            periodEnd: billingPeriodEnd,
            reportedAt: new Date(),
            stripeUsageRecordId: `simulated-egress-${Date.now()}`,
          })
          .returning();

        usageRecordIds.push(egressRecord.id);
      }

      this.logger.log(`Created ${usageRecordIds.length} usage records`);

      await job.updateProgress(100);

      return {
        success: true,
        tenantId,
        subscriptionId: subscription.id,
        usageReported: usageRecordIds.length,
        usage: {
          cpuHours: totalCpuHours,
          memoryGbHours: totalMemGbHours,
          egressGb: totalEgressGb,
        },
        period: {
          start: billingPeriodStart.toISOString(),
          end: billingPeriodEnd.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to report usage for tenant ${tenantId}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
