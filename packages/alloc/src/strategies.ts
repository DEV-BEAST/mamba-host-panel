import type { Database } from '@mambaPanel/db';
import { portPools, ipPools, nodes } from '@mambaPanel/db';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Allocation strategies for ports and IPs
 */

export type PortStrategy = 'sequential' | 'random';
export type IPStrategy = 'rotation' | 'first-available';

export interface CapacityInfo {
  totalCpu: number;
  totalMem: number;
  totalDisk: number;
  usedCpu: number;
  usedMem: number;
  usedDisk: number;
  availableCpu: number;
  availableMem: number;
  availableDisk: number;
  availablePorts: number;
  availableIPs: number;
}

/**
 * Get port using sequential allocation strategy
 * Returns the lowest available port number
 */
export async function getPortSequential(
  db: Database,
  nodeId: string,
  protocol: 'tcp' | 'udp'
): Promise<number | null> {
  return await db.transaction(async (tx) => {
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
      .orderBy(portPools.port) // Sequential (lowest port first)
      .limit(1)
      .for('update');

    if (!available) {
      return null;
    }

    await tx
      .update(portPools)
      .set({ isAllocated: true, updatedAt: new Date() })
      .where(eq(portPools.id, available.id));

    return available.port;
  });
}

/**
 * Get port using random allocation strategy
 * Returns a random available port
 */
export async function getPortRandom(
  db: Database,
  nodeId: string,
  protocol: 'tcp' | 'udp'
): Promise<number | null> {
  return await db.transaction(async (tx) => {
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
      .orderBy(sql`RANDOM()`) // Random selection
      .limit(1)
      .for('update');

    if (!available) {
      return null;
    }

    await tx
      .update(portPools)
      .set({ isAllocated: true, updatedAt: new Date() })
      .where(eq(portPools.id, available.id));

    return available.port;
  });
}

/**
 * Get IP using rotation strategy
 * Distributes load across IPs more evenly
 */
export async function getIPRotation(
  db: Database,
  nodeId: string
): Promise<string | null> {
  return await db.transaction(async (tx) => {
    // Get count of allocated servers per IP
    // Select the IP with the fewest allocations
    const [available] = await tx
      .select()
      .from(ipPools)
      .where(and(eq(ipPools.nodeId, nodeId), eq(ipPools.isAllocated, false)))
      .orderBy(sql`RANDOM()`) // Random among available
      .limit(1)
      .for('update');

    if (!available) {
      return null;
    }

    await tx
      .update(ipPools)
      .set({ isAllocated: true, updatedAt: new Date() })
      .where(eq(ipPools.id, available.id));

    return available.ipAddress;
  });
}

/**
 * Get IP using first-available strategy
 * Returns the first available IP
 */
export async function getIPFirstAvailable(
  db: Database,
  nodeId: string
): Promise<string | null> {
  return await db.transaction(async (tx) => {
    const [available] = await tx
      .select()
      .from(ipPools)
      .where(and(eq(ipPools.nodeId, nodeId), eq(ipPools.isAllocated, false)))
      .limit(1)
      .for('update');

    if (!available) {
      return null;
    }

    await tx
      .update(ipPools)
      .set({ isAllocated: true, updatedAt: new Date() })
      .where(eq(ipPools.id, available.id));

    return available.ipAddress;
  });
}

/**
 * Check node capacity and availability
 */
export async function checkNodeCapacity(
  db: Database,
  nodeId: string,
  requiredCpu: number,
  requiredMem: number,
  requiredDisk: number
): Promise<{
  available: boolean;
  capacity: CapacityInfo;
  reason?: string;
}> {
  // Get node capacity
  const [node] = await db
    .select()
    .from(nodes)
    .where(eq(nodes.id, nodeId))
    .limit(1);

  if (!node) {
    return {
      available: false,
      capacity: null as any,
      reason: 'Node not found',
    };
  }

  // Calculate used resources from servers table
  const usedResources = await db
    .select({
      usedCpu: sql<number>`COALESCE(SUM(cpu_limit_millicores), 0)`,
      usedMem: sql<number>`COALESCE(SUM(mem_limit_mb), 0)`,
      usedDisk: sql<number>`COALESCE(SUM(disk_gb), 0)`,
    })
    .from(sql`servers`)
    .where(
      sql`node_id = ${nodeId} AND status NOT IN ('deleted', 'failed')`
    );

  const used = usedResources[0] || { usedCpu: 0, usedMem: 0, usedDisk: 0 };

  // Count available ports and IPs
  const [portCount] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(portPools)
    .where(
      and(
        eq(portPools.nodeId, nodeId),
        eq(portPools.isAllocated, false)
      )
    );

  const [ipCount] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(ipPools)
    .where(
      and(
        eq(ipPools.nodeId, nodeId),
        eq(ipPools.isAllocated, false)
      )
    );

  const capacity: CapacityInfo = {
    totalCpu: node.capacityCpuMillicores,
    totalMem: node.capacityMemMb,
    totalDisk: node.capacityDiskGb,
    usedCpu: used.usedCpu,
    usedMem: used.usedMem,
    usedDisk: used.usedDisk,
    availableCpu: node.capacityCpuMillicores - used.usedCpu,
    availableMem: node.capacityMemMb - used.usedMem,
    availableDisk: node.capacityDiskGb - used.usedDisk,
    availablePorts: portCount?.count || 0,
    availableIPs: ipCount?.count || 0,
  };

  // Check if resources are available
  let available = true;
  let reason: string | undefined;

  if (capacity.availableCpu < requiredCpu) {
    available = false;
    reason = `Insufficient CPU (required: ${requiredCpu}, available: ${capacity.availableCpu})`;
  } else if (capacity.availableMem < requiredMem) {
    available = false;
    reason = `Insufficient memory (required: ${requiredMem}MB, available: ${capacity.availableMem}MB)`;
  } else if (capacity.availableDisk < requiredDisk) {
    available = false;
    reason = `Insufficient disk (required: ${requiredDisk}GB, available: ${capacity.availableDisk}GB)`;
  } else if (capacity.availableIPs === 0) {
    available = false;
    reason = 'No IP addresses available';
  } else if (capacity.availablePorts === 0) {
    available = false;
    reason = 'No ports available';
  }

  return {
    available,
    capacity,
    reason,
  };
}

/**
 * Find best node for allocation based on available resources
 * Returns node ID with most available capacity
 */
export async function findBestNode(
  db: Database,
  requiredCpu: number,
  requiredMem: number,
  requiredDisk: number
): Promise<string | null> {
  // Get all online nodes
  const onlineNodes = await db
    .select()
    .from(nodes)
    .where(eq(nodes.status, 'online'));

  let bestNode: string | null = null;
  let bestScore = -1;

  for (const node of onlineNodes) {
    const capacityCheck = await checkNodeCapacity(
      db,
      node.id,
      requiredCpu,
      requiredMem,
      requiredDisk
    );

    if (capacityCheck.available) {
      // Score based on available capacity (higher is better)
      // Normalize to 0-100 scale
      const cpuScore = (capacityCheck.capacity.availableCpu / capacityCheck.capacity.totalCpu) * 100;
      const memScore = (capacityCheck.capacity.availableMem / capacityCheck.capacity.totalMem) * 100;
      const diskScore = (capacityCheck.capacity.availableDisk / capacityCheck.capacity.totalDisk) * 100;

      // Weighted average (CPU and memory are more important)
      const score = (cpuScore * 0.4) + (memScore * 0.4) + (diskScore * 0.2);

      if (score > bestScore) {
        bestScore = score;
        bestNode = node.id;
      }
    }
  }

  return bestNode;
}
