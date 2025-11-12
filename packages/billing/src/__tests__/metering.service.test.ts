/**
 * Unit tests for Metering Service
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MeteringService, MetricSample } from '../metering.service';

describe('MeteringService', () => {
  let service: MeteringService;

  beforeEach(() => {
    service = new MeteringService();
  });

  const createSample = (overrides: Partial<MetricSample> = {}): MetricSample => ({
    serverId: 'server-123',
    timestamp: new Date(),
    cpuUsagePercent: 50,
    memUsageMb: 1024,
    diskUsedMb: 5120,
    networkEgressBytes: 1024 * 1024,
    cpuLimitMillicores: 2000,
    memLimitMb: 2048,
    ...overrides,
  });

  describe('RAM Usage Calculation', () => {
    it('should calculate RAM MB-hours correctly', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-01T01:00:00Z');

      const samples: MetricSample[] = [
        createSample({ timestamp: start, memUsageMb: 1000 }),
        createSample({ timestamp: end, memUsageMb: 1000 }),
      ];

      const result = service.calculateRamMbHours(samples);

      expect(result).toBe(1000); // 1000 MB * 1 hour
    });

    it('should handle variable memory usage', () => {
      const samples: MetricSample[] = [
        createSample({ timestamp: new Date('2024-01-01T00:00:00Z'), memUsageMb: 1000 }),
        createSample({ timestamp: new Date('2024-01-01T01:00:00Z'), memUsageMb: 2000 }),
        createSample({ timestamp: new Date('2024-01-01T02:00:00Z'), memUsageMb: 1500 }),
      ];

      const result = service.calculateRamMbHours(samples);

      expect(result).toBe(3000); // (1000*1h) + (2000*1h)
    });

    it('should return 0 for empty samples', () => {
      const result = service.calculateRamMbHours([]);
      expect(result).toBe(0);
    });
  });

  describe('CPU Usage Calculation', () => {
    it('should calculate CPU millicore-hours correctly', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-01T01:00:00Z');

      const samples: MetricSample[] = [
        createSample({
          timestamp: start,
          cpuUsagePercent: 50,
          cpuLimitMillicores: 2000,
        }),
        createSample({
          timestamp: end,
          cpuUsagePercent: 50,
          cpuLimitMillicores: 2000,
        }),
      ];

      const result = service.calculateCpuMillicoreHours(samples);

      expect(result).toBe(1000); // 50% of 2000 millicores * 1 hour
    });

    it('should handle 100% CPU usage', () => {
      const samples: MetricSample[] = [
        createSample({
          timestamp: new Date('2024-01-01T00:00:00Z'),
          cpuUsagePercent: 100,
          cpuLimitMillicores: 2000,
        }),
        createSample({
          timestamp: new Date('2024-01-01T01:00:00Z'),
          cpuUsagePercent: 100,
          cpuLimitMillicores: 2000,
        }),
      ];

      const result = service.calculateCpuMillicoreHours(samples);

      expect(result).toBe(2000); // 100% of 2000 millicores * 1 hour
    });
  });

  describe('Disk Usage Calculation', () => {
    it('should calculate disk GB-days correctly', () => {
      const samples: MetricSample[] = [
        createSample({
          timestamp: new Date('2024-01-01T00:00:00Z'),
          diskUsedMb: 10240, // 10 GB
        }),
        createSample({
          timestamp: new Date('2024-01-02T00:00:00Z'),
          diskUsedMb: 10240,
        }),
      ];

      const result = service.calculateDiskGbDays(samples);

      expect(result).toBe(10); // 10 GB * 1 day
    });

    it('should handle fractional days', () => {
      const samples: MetricSample[] = [
        createSample({
          timestamp: new Date('2024-01-01T00:00:00Z'),
          diskUsedMb: 5120, // 5 GB
        }),
        createSample({
          timestamp: new Date('2024-01-01T12:00:00Z'),
          diskUsedMb: 5120,
        }),
      ];

      const result = service.calculateDiskGbDays(samples);

      expect(result).toBe(2.5); // 5 GB * 0.5 days
    });
  });

  describe('Network Egress Calculation', () => {
    it('should calculate egress GB correctly', () => {
      const samples: MetricSample[] = [
        createSample({ networkEgressBytes: 1024 * 1024 * 1024 }), // 1 GB
        createSample({ networkEgressBytes: 2 * 1024 * 1024 * 1024 }), // 2 GB
      ];

      const result = service.calculateEgressGb(samples);

      expect(result).toBe(3); // 1 + 2 GB
    });

    it('should handle bytes to GB conversion', () => {
      const samples: MetricSample[] = [
        createSample({ networkEgressBytes: 512 * 1024 * 1024 }), // 0.5 GB
      ];

      const result = service.calculateEgressGb(samples);

      expect(result).toBeCloseTo(0.5, 2);
    });
  });

  describe('Complete Usage Calculation', () => {
    it('should calculate all meters for a period', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-01T01:00:00Z');

      const samples: MetricSample[] = [
        createSample({
          timestamp: start,
          memUsageMb: 1024,
          cpuUsagePercent: 50,
          cpuLimitMillicores: 2000,
          diskUsedMb: 10240,
          networkEgressBytes: 1024 * 1024 * 1024,
        }),
        createSample({
          timestamp: end,
          memUsageMb: 1024,
          cpuUsagePercent: 50,
          cpuLimitMillicores: 2000,
          diskUsedMb: 10240,
          networkEgressBytes: 1024 * 1024 * 1024,
        }),
      ];

      const result = service.calculateUsage('server-123', 'tenant-123', samples, start, end);

      expect(result.serverId).toBe('server-123');
      expect(result.tenantId).toBe('tenant-123');
      expect(result.meters.ram_mb_hours).toBe(1024);
      expect(result.meters.cpu_millicore_hours).toBe(1000);
      expect(result.meters.disk_gb_days).toBeGreaterThan(0);
      expect(result.meters.egress_gb).toBe(2);
    });
  });
});
