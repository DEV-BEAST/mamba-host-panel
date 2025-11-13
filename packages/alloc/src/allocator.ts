import type { Database } from '@mambaPanel/db';
import { portPools, ipPools, allocations } from '@mambaPanel/db';
import { eq, and } from 'drizzle-orm';

export interface AllocationResult {
  id: string;
  serverId: string;
  nodeId: string;
  ipAddress: string;
  ports: Array<{ port: number; protocol: 'tcp' | 'udp' }>;
}

export interface ReservePortOptions {
  nodeId: string;
  protocol: 'tcp' | 'udp';
  count?: number;
}

export interface ReserveIPOptions {
  nodeId: string;
}

/**
 * Postgres-backed atomic allocator for ports and IPs
 */
export class ResourceAllocator {
  constructor(private db: Database) {}

  /**
   * Reserve a port atomically from the pool
   */
  async reservePort(options: ReservePortOptions): Promise<number | null> {
    const { nodeId, protocol, count = 1 } = options;

    // Use transaction with row-level locking
    return await this.db.transaction(async (tx) => {
      // Find first available port with FOR UPDATE (lock row)
      const [available] = await tx
        .select()
        .from(portPools)
        .where(
          and(
            eq(portPools.nodeId, nodeId),
            eq(portPools.protocol, protocol),
            eq(portPools.isAllocated, false)
          )
        )
        .limit(1)
        .for('update');

      if (!available) {
        return null; // No ports available
      }

      // Mark as allocated
      await tx
        .update(portPools)
        .set({ isAllocated: true, updatedAt: new Date() })
        .where(eq(portPools.id, available.id));

      return available.port;
    });
  }

  /**
   * Reserve multiple ports atomically
   */
  async reservePorts(options: ReservePortOptions): Promise<number[]> {
    const { nodeId, protocol, count = 1 } = options;
    const reserved: number[] = [];

    for (let i = 0; i < count; i++) {
      const port = await this.reservePort({ nodeId, protocol, count: 1 });
      if (port) {
        reserved.push(port);
      } else {
        // Rollback if we can't get all requested ports
        if (reserved.length > 0) {
          await this.releasePorts(nodeId, reserved, protocol);
        }
        throw new Error(`Could not reserve ${count} ports, only ${reserved.length} available`);
      }
    }

    return reserved;
  }

  /**
   * Reserve an IP address atomically
   */
  async reserveIP(options: ReserveIPOptions): Promise<string | null> {
    const { nodeId } = options;

    return await this.db.transaction(async (tx) => {
      // Find first available IP with FOR UPDATE
      const [available] = await tx
        .select()
        .from(ipPools)
        .where(and(eq(ipPools.nodeId, nodeId), eq(ipPools.isAllocated, false)))
        .limit(1)
        .for('update');

      if (!available) {
        return null; // No IPs available
      }

      // Mark as allocated
      await tx
        .update(ipPools)
        .set({ isAllocated: true, updatedAt: new Date() })
        .where(eq(ipPools.id, available.id));

      return available.ipAddress;
    });
  }

  /**
   * Allocate complete resources for a server (IP + ports)
   */
  async allocate(
    serverId: string,
    nodeId: string,
    portsNeeded: Array<{ protocol: 'tcp' | 'udp'; count: number }>
  ): Promise<AllocationResult> {
    // Reserve IP
    const ipAddress = await this.reserveIP({ nodeId });
    if (!ipAddress) {
      throw new Error(`No IP addresses available on node ${nodeId}`);
    }

    // Reserve ports
    const allocatedPorts: Array<{ port: number; protocol: 'tcp' | 'udp' }> = [];

    try {
      for (const { protocol, count } of portsNeeded) {
        const ports = await this.reservePorts({ nodeId, protocol, count });
        allocatedPorts.push(...ports.map((port) => ({ port, protocol })));
      }

      // Record allocation
      const [allocation] = await this.db
        .insert(allocations)
        .values({
          serverId,
          nodeId,
          ipAddress,
          ports: allocatedPorts,
          status: 'allocated',
          allocatedAt: new Date(),
        })
        .returning();

      // Update pool records with server reference
      await this.db
        .update(ipPools)
        .set({ allocatedToServerId: serverId })
        .where(and(eq(ipPools.nodeId, nodeId), eq(ipPools.ipAddress, ipAddress)));

      for (const { port, protocol } of allocatedPorts) {
        await this.db
          .update(portPools)
          .set({ allocatedToServerId: serverId })
          .where(
            and(
              eq(portPools.nodeId, nodeId),
              eq(portPools.port, port),
              eq(portPools.protocol, protocol)
            )
          );
      }

      return {
        id: allocation.id,
        serverId,
        nodeId,
        ipAddress,
        ports: allocatedPorts,
      };
    } catch (error) {
      // Rollback IP allocation on failure
      await this.releaseIP(nodeId, ipAddress);
      throw error;
    }
  }

  /**
   * Release all allocations for a server
   */
  async releaseByServer(serverId: string): Promise<void> {
    // Get allocation record
    const [allocation] = await this.db
      .select()
      .from(allocations)
      .where(eq(allocations.serverId, serverId));

    if (!allocation) {
      return; // No allocation to release
    }

    // Release IP
    await this.db
      .update(ipPools)
      .set({
        isAllocated: false,
        allocatedToServerId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ipPools.nodeId, allocation.nodeId),
          eq(ipPools.ipAddress, allocation.ipAddress)
        )
      );

    // Release ports
    for (const { port, protocol } of allocation.ports as any[]) {
      await this.db
        .update(portPools)
        .set({
          isAllocated: false,
          allocatedToServerId: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(portPools.nodeId, allocation.nodeId),
            eq(portPools.port, port),
            eq(portPools.protocol, protocol)
          )
        );
    }

    // Mark allocation as released
    await this.db
      .update(allocations)
      .set({ status: 'released', releasedAt: new Date() })
      .where(eq(allocations.id, allocation.id));
  }

  /**
   * Release all allocations on a node (for node decommission)
   */
  async releaseByNode(nodeId: string): Promise<void> {
    // Release all IPs
    await this.db
      .update(ipPools)
      .set({
        isAllocated: false,
        allocatedToServerId: null,
        updatedAt: new Date(),
      })
      .where(eq(ipPools.nodeId, nodeId));

    // Release all ports
    await this.db
      .update(portPools)
      .set({
        isAllocated: false,
        allocatedToServerId: null,
        updatedAt: new Date(),
      })
      .where(eq(portPools.nodeId, nodeId));

    // Mark all allocations as released
    await this.db
      .update(allocations)
      .set({ status: 'released', releasedAt: new Date() })
      .where(eq(allocations.nodeId, nodeId));
  }

  /**
   * Scan for orphaned allocations (allocated but no active server)
   */
  async scanLeaks(): Promise<
    Array<{ serverId: string; nodeId: string; ipAddress: string }>
  > {
    // Find all allocated resources
    // Note: This returns all allocated resources - caller should verify if servers exist
    const leaks = await this.db
      .select()
      .from(allocations)
      .where(eq(allocations.status, 'allocated'));

    return leaks.map((leak) => ({
      serverId: leak.serverId,
      nodeId: leak.nodeId,
      ipAddress: leak.ipAddress,
    }));
  }

  /**
   * Helper: Release specific IP
   */
  private async releaseIP(nodeId: string, ipAddress: string): Promise<void> {
    await this.db
      .update(ipPools)
      .set({
        isAllocated: false,
        allocatedToServerId: null,
        updatedAt: new Date(),
      })
      .where(and(eq(ipPools.nodeId, nodeId), eq(ipPools.ipAddress, ipAddress)));
  }

  /**
   * Helper: Release specific ports
   */
  private async releasePorts(
    nodeId: string,
    ports: number[],
    protocol: 'tcp' | 'udp'
  ): Promise<void> {
    for (const port of ports) {
      await this.db
        .update(portPools)
        .set({
          isAllocated: false,
          allocatedToServerId: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(portPools.nodeId, nodeId),
            eq(portPools.port, port),
            eq(portPools.protocol, protocol)
          )
        );
    }
  }
}
