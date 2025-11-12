/**
 * Unit tests for Resource Allocator
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Allocator } from '../allocator';

describe('Allocator', () => {
  let allocator: Allocator;

  beforeEach(() => {
    // Mock database connection would go here
    allocator = new Allocator(/* mockDb */);
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Port Allocation', () => {
    it('should reserve an available port atomically', async () => {
      const nodeId = 'node-123';
      const protocol = 'tcp';

      const result = await allocator.reservePort(nodeId, protocol);

      expect(result).toBeDefined();
      expect(result.port).toBeGreaterThan(0);
      expect(result.protocol).toBe(protocol);
      expect(result.isAllocated).toBe(true);
    });

    it('should not allocate the same port twice', async () => {
      const nodeId = 'node-123';
      const protocol = 'tcp';

      const first = await allocator.reservePort(nodeId, protocol);
      const second = await allocator.reservePort(nodeId, protocol);

      expect(first.port).not.toBe(second.port);
    });

    it('should throw error when no ports available', async () => {
      const nodeId = 'node-full';
      const protocol = 'tcp';

      await expect(
        allocator.reservePort(nodeId, protocol)
      ).rejects.toThrow('No available ports');
    });

    it('should handle concurrent allocations without conflicts', async () => {
      const nodeId = 'node-123';
      const protocol = 'tcp';
      const concurrentRequests = 10;

      const results = await Promise.all(
        Array.from({ length: concurrentRequests }, () =>
          allocator.reservePort(nodeId, protocol)
        )
      );

      const ports = results.map((r) => r.port);
      const uniquePorts = new Set(ports);

      expect(uniquePorts.size).toBe(concurrentRequests);
    });
  });

  describe('IP Allocation', () => {
    it('should allocate an available IP address', async () => {
      const nodeId = 'node-123';

      const result = await allocator.reserveIP(nodeId);

      expect(result).toBeDefined();
      expect(result.ipAddress).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(result.isAllocated).toBe(true);
    });

    it('should not allocate the same IP twice', async () => {
      const nodeId = 'node-123';

      const first = await allocator.reserveIP(nodeId);
      const second = await allocator.reserveIP(nodeId);

      expect(first.ipAddress).not.toBe(second.ipAddress);
    });
  });

  describe('Full Server Allocation', () => {
    it('should allocate complete resources for a server', async () => {
      const serverId = 'server-123';
      const nodeId = 'node-123';

      const result = await allocator.allocate(serverId, nodeId);

      expect(result).toBeDefined();
      expect(result.serverId).toBe(serverId);
      expect(result.nodeId).toBe(nodeId);
      expect(result.ipAddress).toBeDefined();
      expect(result.ports).toBeDefined();
      expect(result.ports.length).toBeGreaterThan(0);
    });

    it('should be idempotent for same server', async () => {
      const serverId = 'server-123';
      const nodeId = 'node-123';

      const first = await allocator.allocate(serverId, nodeId);
      const second = await allocator.allocate(serverId, nodeId);

      expect(first).toEqual(second);
    });
  });

  describe('Release Resources', () => {
    it('should release all resources for a server', async () => {
      const serverId = 'server-123';
      const nodeId = 'node-123';

      await allocator.allocate(serverId, nodeId);
      const released = await allocator.releaseByServer(serverId);

      expect(released).toBe(true);
    });

    it('should make resources available after release', async () => {
      const serverId = 'server-123';
      const nodeId = 'node-123';

      const allocation = await allocator.allocate(serverId, nodeId);
      await allocator.releaseByServer(serverId);

      // Should be able to allocate the same resources again
      const newServerId = 'server-456';
      const newAllocation = await allocator.allocate(newServerId, nodeId);

      expect(newAllocation.ipAddress).toBe(allocation.ipAddress);
    });
  });

  describe('Leak Scanner', () => {
    it('should detect orphaned allocations', async () => {
      // Create allocation for a server
      await allocator.allocate('server-orphaned', 'node-123');

      // Simulate server deletion without releasing allocation
      const leaks = await allocator.scanLeaks();

      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks).toContainEqual(
        expect.objectContaining({
          serverId: 'server-orphaned',
        })
      );
    });

    it('should not report allocations with active servers', async () => {
      await allocator.allocate('server-active', 'node-123');

      const leaks = await allocator.scanLeaks();

      expect(leaks).not.toContainEqual(
        expect.objectContaining({
          serverId: 'server-active',
        })
      );
    });
  });
});
