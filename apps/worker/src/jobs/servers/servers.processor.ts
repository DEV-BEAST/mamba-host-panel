import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectDrizzle } from '../../common/database/database.module';
import type { NodeDatabase } from '@mambaPanel/db';
import { servers, allocations, blueprints, nodes, serverLogs } from '@mambaPanel/db';
import { eq, and } from 'drizzle-orm';
import { ResourceAllocator, RESOURCE_ALLOCATOR } from '@mambaPanel/alloc';

/**
 * Server Lifecycle Job Processor
 *
 * Handles all server lifecycle operations:
 * - install-server: Create and install a new server
 * - update-server: Update server configuration
 * - restart-server: Restart a server
 * - delete-server: Delete a server and clean up resources
 */

export interface InstallServerJobData {
  serverId: string;
  blueprintId: string;
  nodeId: string;
  cpuLimitMillicores: number;
  memLimitMb: number;
  diskLimitMb: number;
  variables?: Record<string, string>;
}

export interface UpdateServerJobData {
  serverId: string;
  cpuLimitMillicores?: number;
  memLimitMb?: number;
  diskLimitMb?: number;
  variables?: Record<string, string>;
}

export interface RestartServerJobData {
  serverId: string;
  graceful?: boolean;
}

export interface DeleteServerJobData {
  serverId: string;
}

@Processor('servers')
export class ServersProcessor extends WorkerHost {
  private readonly logger = new Logger(ServersProcessor.name);

  constructor(
    @InjectDrizzle() private readonly db: NodeDatabase,
    @Inject(RESOURCE_ALLOCATOR) private readonly allocator: ResourceAllocator
  ) {
    super();
  }

  /**
   * Install a new server
   *
   * Flow:
   * 1. Reserve port allocation from the allocator
   * 2. Fetch blueprint configuration
   * 3. Call Wings API to create container
   * 4. Run installation script if provided
   * 5. Poll health check until server is running
   * 6. Mark server as 'running' in database
   */
  async process(job: Job<InstallServerJobData | UpdateServerJobData | RestartServerJobData | DeleteServerJobData>) {
    const { name, data } = job;

    switch (name) {
      case 'install-server':
        return this.installServer(job as Job<InstallServerJobData>);
      case 'update-server':
        return this.updateServer(job as Job<UpdateServerJobData>);
      case 'restart-server':
        return this.restartServer(job as Job<RestartServerJobData>);
      case 'delete-server':
        return this.deleteServer(job as Job<DeleteServerJobData>);
      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  }

  private async installServer(job: Job<InstallServerJobData>) {
    const { serverId, blueprintId, nodeId, cpuLimitMillicores, memLimitMb, diskLimitMb, variables } = job.data;

    this.logger.log(`Installing server ${serverId} on node ${nodeId}`);

    try {
      // Step 1: Reserve allocation
      await job.updateProgress(10);
      this.logger.log(`Reserving allocation for server ${serverId}`);

      const allocation = await this.allocator.reserveAllocation(
        nodeId,
        serverId,
        1, // ports needed
        'tcp',
        'sequential' // strategy
      );

      if (!allocation) {
        throw new Error(`Failed to allocate resources for server ${serverId} on node ${nodeId}`);
      }

      const portList = allocation.ports.map(p => p.port).join(',');
      this.logger.log(`Allocated ${allocation.ipAddress}:${portList} for server ${serverId}`);

      await this.logServerEvent(serverId, 'info', `Allocated ${allocation.ipAddress}:${allocation.ports[0].port}`);

      // Step 2: Fetch blueprint
      await job.updateProgress(20);
      const [blueprint] = await this.db
        .select()
        .from(blueprints)
        .where(eq(blueprints.id, blueprintId))
        .limit(1);

      if (!blueprint) {
        throw new Error(`Blueprint ${blueprintId} not found`);
      }

      this.logger.log(`Using blueprint: ${blueprint.name}`);

      // Step 3: Fetch node information for Wings API
      const [node] = await this.db
        .select()
        .from(nodes)
        .where(eq(nodes.id, nodeId))
        .limit(1);

      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }

      // Step 4: Prepare container configuration
      await job.updateProgress(30);
      const containerConfig = {
        id: serverId,
        image: blueprint.dockerImage,
        cpu_limit: cpuLimitMillicores,
        memory_limit: memLimitMb,
        disk_limit: diskLimitMb,
        ports: allocation.ports.map(p => ({
          port: p.port,
          protocol: p.protocol,
        })),
        ip_address: allocation.ipAddress,
        environment: {
          ...blueprint.defaultVariables,
          ...variables,
        },
        startup_command: blueprint.startupCommand,
      };

      await this.logServerEvent(serverId, 'info', 'Creating container on Wings node');

      // Step 5: Call Wings API to create container
      // TODO: Implement Wings API client call
      // const wingsClient = new WingsClient(node.fqdn, node.apiPort);
      // await wingsClient.createContainer(containerConfig);

      // For now, simulate the call
      this.logger.log(`[SIMULATED] Creating container on Wings node ${node.fqdn}`);
      await this.sleep(2000);

      await job.updateProgress(50);

      // Step 6: Run installation script if provided
      if (blueprint.installScript) {
        await this.logServerEvent(serverId, 'info', 'Running installation script');
        this.logger.log(`Running installation script for server ${serverId}`);

        // TODO: Call Wings API to execute install script
        // await wingsClient.executeScript(serverId, blueprint.installScript);

        // For now, simulate
        this.logger.log(`[SIMULATED] Running install script`);
        await this.sleep(3000);
      }

      await job.updateProgress(70);

      // Step 7: Start the server
      await this.logServerEvent(serverId, 'info', 'Starting server');
      this.logger.log(`Starting server ${serverId}`);

      // TODO: Call Wings API to start server
      // await wingsClient.startServer(serverId);

      // For now, simulate
      this.logger.log(`[SIMULATED] Starting server`);
      await this.sleep(2000);

      await job.updateProgress(80);

      // Step 8: Health check polling
      await this.logServerEvent(serverId, 'info', 'Waiting for server to become healthy');
      this.logger.log(`Polling health check for server ${serverId}`);

      const isHealthy = await this.pollHealthCheck(serverId, node.fqdn, 30, 5000);

      if (!isHealthy) {
        throw new Error(`Server ${serverId} failed health check`);
      }

      await job.updateProgress(90);

      // Step 9: Mark server as running
      await this.db
        .update(servers)
        .set({
          status: 'running',
          installedAt: new Date(),
        })
        .where(eq(servers.id, serverId));

      await this.logServerEvent(serverId, 'success', 'Server installed and running');

      this.logger.log(`Server ${serverId} installed successfully`);

      await job.updateProgress(100);

      return {
        success: true,
        serverId,
        allocation: {
          ipAddress: allocation.ipAddress,
          ports: allocation.ports,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to install server ${serverId}: ${error.message}`, error.stack);
      await this.logServerEvent(serverId, 'error', `Installation failed: ${error.message}`);

      // Mark server as failed
      await this.db
        .update(servers)
        .set({ status: 'failed' })
        .where(eq(servers.id, serverId));

      // Release allocation if it was created
      try {
        await this.allocator.releaseAllocation(serverId);
      } catch (releaseError) {
        this.logger.error(`Failed to release allocation for ${serverId}: ${releaseError.message}`);
      }

      throw error;
    }
  }

  private async updateServer(job: Job<UpdateServerJobData>) {
    const { serverId, cpuLimitMillicores, memLimitMb, diskLimitMb, variables } = job.data;

    this.logger.log(`Updating server ${serverId}`);

    try {
      await job.updateProgress(10);

      // Fetch current server
      const [server] = await this.db
        .select()
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (!server) {
        throw new Error(`Server ${serverId} not found`);
      }

      await this.logServerEvent(serverId, 'info', 'Updating server configuration');

      // Build update payload
      const updates: Partial<typeof servers.$inferInsert> = {};
      if (cpuLimitMillicores !== undefined) updates.cpuLimitMillicores = cpuLimitMillicores;
      if (memLimitMb !== undefined) updates.memLimitMb = memLimitMb;
      if (diskLimitMb !== undefined) updates.diskLimitMb = diskLimitMb;

      await job.updateProgress(30);

      // Update database
      if (Object.keys(updates).length > 0) {
        await this.db
          .update(servers)
          .set(updates)
          .where(eq(servers.id, serverId));
      }

      await job.updateProgress(50);

      // TODO: Call Wings API to update container limits
      // const node = await this.getServerNode(serverId);
      // const wingsClient = new WingsClient(node.fqdn, node.apiPort);
      // await wingsClient.updateContainer(serverId, { cpuLimit, memLimit, diskLimit });

      this.logger.log(`[SIMULATED] Updating container limits on Wings`);
      await this.sleep(1000);

      await job.updateProgress(70);

      // Update environment variables if provided
      if (variables) {
        // TODO: Call Wings API to update environment
        // await wingsClient.updateEnvironment(serverId, variables);

        this.logger.log(`[SIMULATED] Updating environment variables`);
        await this.sleep(1000);
      }

      await job.updateProgress(90);

      await this.logServerEvent(serverId, 'success', 'Server configuration updated');

      this.logger.log(`Server ${serverId} updated successfully`);

      await job.updateProgress(100);

      return { success: true, serverId };
    } catch (error) {
      this.logger.error(`Failed to update server ${serverId}: ${error.message}`, error.stack);
      await this.logServerEvent(serverId, 'error', `Update failed: ${error.message}`);
      throw error;
    }
  }

  private async restartServer(job: Job<RestartServerJobData>) {
    const { serverId, graceful = true } = job.data;

    this.logger.log(`Restarting server ${serverId} (graceful: ${graceful})`);

    try {
      await job.updateProgress(10);

      const [server] = await this.db
        .select()
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (!server) {
        throw new Error(`Server ${serverId} not found`);
      }

      await this.logServerEvent(serverId, 'info', `Restarting server (${graceful ? 'graceful' : 'force'})`);

      // Step 1: Stop the server
      await job.updateProgress(20);
      await this.db
        .update(servers)
        .set({ status: 'stopping' })
        .where(eq(servers.id, serverId));

      // TODO: Call Wings API to stop server
      // const node = await this.getServerNode(serverId);
      // const wingsClient = new WingsClient(node.fqdn, node.apiPort);
      // await wingsClient.stopServer(serverId, graceful);

      this.logger.log(`[SIMULATED] Stopping server ${serverId}`);
      await this.sleep(graceful ? 3000 : 1000);

      await job.updateProgress(50);

      await this.db
        .update(servers)
        .set({ status: 'stopped' })
        .where(eq(servers.id, serverId));

      // Step 2: Start the server
      await job.updateProgress(60);
      await this.db
        .update(servers)
        .set({ status: 'starting' })
        .where(eq(servers.id, serverId));

      await this.logServerEvent(serverId, 'info', 'Starting server');

      // TODO: Call Wings API to start server
      // await wingsClient.startServer(serverId);

      this.logger.log(`[SIMULATED] Starting server ${serverId}`);
      await this.sleep(2000);

      await job.updateProgress(80);

      // Step 3: Health check
      const [node] = await this.db
        .select()
        .from(nodes)
        .where(eq(nodes.id, server.nodeId))
        .limit(1);

      const isHealthy = await this.pollHealthCheck(serverId, node.fqdn, 20, 3000);

      if (!isHealthy) {
        throw new Error(`Server ${serverId} failed health check after restart`);
      }

      await job.updateProgress(95);

      await this.db
        .update(servers)
        .set({ status: 'running' })
        .where(eq(servers.id, serverId));

      await this.logServerEvent(serverId, 'success', 'Server restarted successfully');

      this.logger.log(`Server ${serverId} restarted successfully`);

      await job.updateProgress(100);

      return { success: true, serverId };
    } catch (error) {
      this.logger.error(`Failed to restart server ${serverId}: ${error.message}`, error.stack);
      await this.logServerEvent(serverId, 'error', `Restart failed: ${error.message}`);

      await this.db
        .update(servers)
        .set({ status: 'failed' })
        .where(eq(servers.id, serverId));

      throw error;
    }
  }

  private async deleteServer(job: Job<DeleteServerJobData>) {
    const { serverId } = job.data;

    this.logger.log(`Deleting server ${serverId}`);

    try {
      await job.updateProgress(10);

      const [server] = await this.db
        .select()
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (!server) {
        throw new Error(`Server ${serverId} not found`);
      }

      await this.logServerEvent(serverId, 'info', 'Deleting server');

      // Step 1: Stop the server if it's running
      if (server.status === 'running' || server.status === 'starting') {
        await job.updateProgress(20);
        await this.logServerEvent(serverId, 'info', 'Stopping server before deletion');

        // TODO: Call Wings API to stop server
        // const node = await this.getServerNode(serverId);
        // const wingsClient = new WingsClient(node.fqdn, node.apiPort);
        // await wingsClient.stopServer(serverId, false);

        this.logger.log(`[SIMULATED] Stopping server ${serverId}`);
        await this.sleep(2000);
      }

      await job.updateProgress(40);

      // Step 2: Delete container from Wings
      await this.logServerEvent(serverId, 'info', 'Deleting container');

      // TODO: Call Wings API to delete container
      // await wingsClient.deleteContainer(serverId);

      this.logger.log(`[SIMULATED] Deleting container ${serverId}`);
      await this.sleep(1000);

      await job.updateProgress(60);

      // Step 3: Release allocation
      await this.logServerEvent(serverId, 'info', 'Releasing port allocation');

      await this.allocator.releaseAllocation(serverId);

      this.logger.log(`Released allocation for server ${serverId}`);

      await job.updateProgress(80);

      // Step 4: Mark server as deleted in database
      await this.db
        .update(servers)
        .set({
          status: 'deleted',
          deletedAt: new Date(),
        })
        .where(eq(servers.id, serverId));

      await this.logServerEvent(serverId, 'success', 'Server deleted successfully');

      this.logger.log(`Server ${serverId} deleted successfully`);

      await job.updateProgress(100);

      return { success: true, serverId };
    } catch (error) {
      this.logger.error(`Failed to delete server ${serverId}: ${error.message}`, error.stack);
      await this.logServerEvent(serverId, 'error', `Deletion failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Poll health check endpoint until server is healthy or timeout
   */
  private async pollHealthCheck(
    serverId: string,
    nodeFqdn: string,
    maxAttempts: number,
    delayMs: number
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.logger.log(`Health check attempt ${attempt}/${maxAttempts} for server ${serverId}`);

      // TODO: Call Wings API health check
      // const wingsClient = new WingsClient(nodeFqdn);
      // const health = await wingsClient.checkHealth(serverId);
      // if (health.status === 'healthy') return true;

      // For now, simulate health check
      if (attempt >= 3) {
        // Simulate success after 3 attempts
        this.logger.log(`Server ${serverId} is healthy`);
        return true;
      }

      if (attempt < maxAttempts) {
        await this.sleep(delayMs);
      }
    }

    this.logger.warn(`Server ${serverId} health check timed out after ${maxAttempts} attempts`);
    return false;
  }

  /**
   * Log server event to database
   */
  private async logServerEvent(serverId: string, level: 'info' | 'warning' | 'error' | 'success', message: string) {
    try {
      await this.db.insert(serverLogs).values({
        serverId,
        level,
        message,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to log server event: ${error.message}`);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
