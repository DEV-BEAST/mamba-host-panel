/**
 * Usage Metering Service
 * Calculates usage metrics for billing
 */

export interface MeterDefinition {
  name: string;
  unit: string;
  aggregationType: 'sum' | 'average' | 'max';
}

export const METER_DEFINITIONS: Record<string, MeterDefinition> = {
  ram_mb_hours: {
    name: 'RAM Usage (MB-Hours)',
    unit: 'mb_hours',
    aggregationType: 'sum',
  },
  cpu_millicore_hours: {
    name: 'CPU Usage (Millicore-Hours)',
    unit: 'millicore_hours',
    aggregationType: 'sum',
  },
  disk_gb_days: {
    name: 'Disk Usage (GB-Days)',
    unit: 'gb_days',
    aggregationType: 'sum',
  },
  egress_gb: {
    name: 'Network Egress (GB)',
    unit: 'gb',
    aggregationType: 'sum',
  },
};

export interface MetricSample {
  serverId: string;
  timestamp: Date;
  cpuUsagePercent: number;
  memUsageMb: number;
  diskUsedMb: number;
  networkEgressBytes: number;
  cpuLimitMillicores: number;
  memLimitMb: number;
}

export interface UsageCalculation {
  serverId: string;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  meters: {
    ram_mb_hours: number;
    cpu_millicore_hours: number;
    disk_gb_days: number;
    egress_gb: number;
  };
}

export class MeteringService {
  /**
   * Calculate RAM usage in MB-hours
   * Formula: (memUsageMb * hours)
   */
  calculateRamMbHours(samples: MetricSample[]): number {
    if (samples.length === 0) return 0;

    let totalMbHours = 0;
    for (let i = 0; i < samples.length - 1; i++) {
      const current = samples[i];
      const next = samples[i + 1];
      const hoursDiff =
        (next.timestamp.getTime() - current.timestamp.getTime()) / (1000 * 60 * 60);

      totalMbHours += current.memUsageMb * hoursDiff;
    }

    return Math.round(totalMbHours * 100) / 100;
  }

  /**
   * Calculate CPU usage in millicore-hours
   * Formula: (cpuUsagePercent * cpuLimitMillicores / 100) * hours
   */
  calculateCpuMillicoreHours(samples: MetricSample[]): number {
    if (samples.length === 0) return 0;

    let totalMillicoreHours = 0;
    for (let i = 0; i < samples.length - 1; i++) {
      const current = samples[i];
      const next = samples[i + 1];
      const hoursDiff =
        (next.timestamp.getTime() - current.timestamp.getTime()) / (1000 * 60 * 60);

      const usedMillicores = (current.cpuUsagePercent / 100) * current.cpuLimitMillicores;
      totalMillicoreHours += usedMillicores * hoursDiff;
    }

    return Math.round(totalMillicoreHours * 100) / 100;
  }

  /**
   * Calculate disk usage in GB-days
   * Formula: (diskUsedMb / 1024) * days
   */
  calculateDiskGbDays(samples: MetricSample[]): number {
    if (samples.length === 0) return 0;

    let totalGbDays = 0;
    for (let i = 0; i < samples.length - 1; i++) {
      const current = samples[i];
      const next = samples[i + 1];
      const daysDiff =
        (next.timestamp.getTime() - current.timestamp.getTime()) / (1000 * 60 * 60 * 24);

      const diskGb = current.diskUsedMb / 1024;
      totalGbDays += diskGb * daysDiff;
    }

    return Math.round(totalGbDays * 100) / 100;
  }

  /**
   * Calculate network egress in GB
   * Formula: sum(networkEgressBytes) / (1024^3)
   */
  calculateEgressGb(samples: MetricSample[]): number {
    if (samples.length === 0) return 0;

    const totalBytes = samples.reduce((sum, sample) => sum + sample.networkEgressBytes, 0);
    const totalGb = totalBytes / (1024 * 1024 * 1024);

    return Math.round(totalGb * 100) / 100;
  }

  /**
   * Calculate all usage metrics for a period
   */
  calculateUsage(
    serverId: string,
    tenantId: string,
    samples: MetricSample[],
    periodStart: Date,
    periodEnd: Date
  ): UsageCalculation {
    return {
      serverId,
      tenantId,
      periodStart,
      periodEnd,
      meters: {
        ram_mb_hours: this.calculateRamMbHours(samples),
        cpu_millicore_hours: this.calculateCpuMillicoreHours(samples),
        disk_gb_days: this.calculateDiskGbDays(samples),
        egress_gb: this.calculateEgressGb(samples),
      },
    };
  }
}

export default MeteringService;
