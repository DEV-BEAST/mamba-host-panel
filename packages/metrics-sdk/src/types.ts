import { z } from 'zod';

/**
 * Metric sample from Wings daemon
 */
export const MetricSampleSchema = z.object({
  serverId: z.string().uuid(),
  nodeId: z.string().uuid(),
  timestamp: z.date(),
  cpuUsagePercent: z.number().min(0).max(100),
  memoryUsageMb: z.number().min(0),
  diskUsageGb: z.number().min(0),
  networkEgressMb: z.number().min(0),
  networkIngressMb: z.number().min(0),
  containerUptime: z.number().min(0), // seconds
});

export type MetricSample = z.infer<typeof MetricSampleSchema>;

/**
 * Batch of metric samples from Wings
 */
export const MetricBatchSchema = z.object({
  nodeId: z.string().uuid(),
  samples: z.array(MetricSampleSchema),
  collectedAt: z.date(),
});

export type MetricBatch = z.infer<typeof MetricBatchSchema>;

/**
 * Aggregated hourly metrics
 */
export interface HourlyMetrics {
  serverId: string;
  tenantId: string;
  nodeId: string;
  hourTimestamp: Date;
  cpuMillicoreAvg: number;
  memMbAvg: number;
  diskGbUsed: number;
  egressMbTotal: number;
  ingressMbTotal: number;
  samplesCount: number;
}

/**
 * Usage meters for billing
 */
export enum UsageMeter {
  RAM_MB_HOURS = 'ram_mb_hours',
  CPU_MILLICORE_HOURS = 'cpu_millicore_hours',
  DISK_GB_MONTH = 'disk_gb_month',
  EGRESS_GB = 'egress_gb',
}

/**
 * Usage record for a meter
 */
export interface UsageRecord {
  subscriptionItemId: string;
  tenantId: string;
  serverId: string | null;
  meterType: UsageMeter;
  quantity: number;
  periodStart: Date;
  periodEnd: Date;
  stripeUsageRecordId?: string;
  reportedAt?: Date;
}

/**
 * Heartbeat from Wings daemon
 */
export const HeartbeatSchema = z.object({
  nodeId: z.string().uuid(),
  timestamp: z.date(),
  systemInfo: z.object({
    cpuCount: z.number(),
    memoryTotalMb: z.number(),
    memoryAvailableMb: z.number(),
    diskTotalGb: z.number(),
    diskAvailableGb: z.number(),
  }),
  containerCount: z.number(),
});

export type Heartbeat = z.infer<typeof HeartbeatSchema>;
