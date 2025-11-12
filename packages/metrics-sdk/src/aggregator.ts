import type { MetricSample, HourlyMetrics, UsageRecord } from './types';
import { UsageMeter } from './types';

/**
 * Aggregate raw metric samples into hourly rollups
 */
export function aggregateHourly(samples: MetricSample[]): Map<string, HourlyMetrics> {
  const hourlyMap = new Map<string, HourlyMetrics>();

  for (const sample of samples) {
    // Round timestamp to hour
    const hourTimestamp = new Date(sample.timestamp);
    hourTimestamp.setMinutes(0, 0, 0);

    const key = `${sample.serverId}-${hourTimestamp.getTime()}`;

    if (!hourlyMap.has(key)) {
      hourlyMap.set(key, {
        serverId: sample.serverId,
        tenantId: '', // Must be filled in by caller
        nodeId: sample.nodeId,
        hourTimestamp,
        cpuMillicoreAvg: 0,
        memMbAvg: 0,
        diskGbUsed: 0,
        egressMbTotal: 0,
        ingressMbTotal: 0,
        samplesCount: 0,
      });
    }

    const hourly = hourlyMap.get(key)!;
    hourly.cpuMillicoreAvg += (sample.cpuUsagePercent / 100) * 1000; // Convert % to millicores
    hourly.memMbAvg += sample.memoryUsageMb;
    hourly.diskGbUsed = Math.max(hourly.diskGbUsed, sample.diskUsageGb); // Use max
    hourly.egressMbTotal += sample.networkEgressMb;
    hourly.ingressMbTotal += sample.networkIngressMb;
    hourly.samplesCount++;
  }

  // Calculate averages
  for (const hourly of hourlyMap.values()) {
    if (hourly.samplesCount > 0) {
      hourly.cpuMillicoreAvg = Math.round(hourly.cpuMillicoreAvg / hourly.samplesCount);
      hourly.memMbAvg = Math.round(hourly.memMbAvg / hourly.samplesCount);
    }
  }

  return hourlyMap;
}

/**
 * Calculate usage records from hourly metrics for billing period
 */
export function calculateUsage(
  hourlyMetrics: HourlyMetrics[],
  periodStart: Date,
  periodEnd: Date
): Map<UsageMeter, number> {
  const usage = new Map<UsageMeter, number>();

  // Initialize meters
  usage.set(UsageMeter.RAM_MB_HOURS, 0);
  usage.set(UsageMeter.CPU_MILLICORE_HOURS, 0);
  usage.set(UsageMeter.DISK_GB_MONTH, 0);
  usage.set(UsageMeter.EGRESS_GB, 0);

  for (const metric of hourlyMetrics) {
    // RAM MB-hours: average MB * 1 hour
    usage.set(
      UsageMeter.RAM_MB_HOURS,
      (usage.get(UsageMeter.RAM_MB_HOURS) || 0) + metric.memMbAvg
    );

    // CPU millicore-hours: average millicores * 1 hour
    usage.set(
      UsageMeter.CPU_MILLICORE_HOURS,
      (usage.get(UsageMeter.CPU_MILLICORE_HOURS) || 0) + metric.cpuMillicoreAvg
    );

    // Disk GB-month: average disk usage normalized to 30 days
    const hoursInPeriod =
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60);
    const hoursInMonth = 30 * 24;
    const diskGbMonth = (metric.diskGbUsed * hoursInPeriod) / hoursInMonth;
    usage.set(
      UsageMeter.DISK_GB_MONTH,
      (usage.get(UsageMeter.DISK_GB_MONTH) || 0) + diskGbMonth
    );

    // Egress GB: total network out converted to GB
    usage.set(
      UsageMeter.EGRESS_GB,
      (usage.get(UsageMeter.EGRESS_GB) || 0) + metric.egressMbTotal / 1024
    );
  }

  return usage;
}
