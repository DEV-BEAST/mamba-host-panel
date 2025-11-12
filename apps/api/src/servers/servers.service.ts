import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../common/database/database.module';
import { SERVER_QUEUE } from '../common/queue/queue.module';
import { servers, blueprints, nodes, tenantMembers } from '@mambaPanel/db';
import { eq, and } from 'drizzle-orm';
import type { Database } from '@mambaPanel/db';
import type { Queue } from 'bullmq';
import { TenantsService } from '../tenants/tenants.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';

@Injectable()
export class ServersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private dbConnection: { db: Database },
    @Inject(SERVER_QUEUE)
    private serverQueue: Queue,
    private tenantsService: TenantsService
  ) {}

  /**
   * Get all servers for user's active tenant
   */
  async findAll(userId: string) {
    const activeTenantId = await this.tenantsService.getActiveTenantId(userId);

    if (!activeTenantId) {
      return [];
    }

    // Verify user has access to tenant
    await this.verifyTenantAccess(userId, activeTenantId);

    return this.dbConnection.db
      .select()
      .from(servers)
      .where(eq(servers.tenantId, activeTenantId));
  }

  /**
   * Get server by ID (with tenant access check)
   */
  async findById(userId: string, serverId: string) {
    const [server] = await this.dbConnection.db
      .select()
      .from(servers)
      .where(eq(servers.id, serverId))
      .limit(1);

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    // Verify user has access to server's tenant
    await this.verifyTenantAccess(userId, server.tenantId);

    return server;
  }

  /**
   * Create a new server (enqueues install job)
   */
  async create(userId: string, dto: CreateServerDto) {
    const activeTenantId = await this.tenantsService.getActiveTenantId(userId);

    if (!activeTenantId) {
      throw new BadRequestException('No active tenant selected');
    }

    // Verify user has access to tenant
    await this.verifyTenantAccess(userId, activeTenantId);

    // Verify blueprint exists
    const [blueprint] = await this.dbConnection.db
      .select()
      .from(blueprints)
      .where(eq(blueprints.id, dto.blueprintId))
      .limit(1);

    if (!blueprint) {
      throw new NotFoundException('Blueprint not found');
    }

    // Verify node exists
    const [node] = await this.dbConnection.db
      .select()
      .from(nodes)
      .where(eq(nodes.id, dto.nodeId))
      .limit(1);

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    // Create server record (in 'installing' status)
    const [server] = await this.dbConnection.db
      .insert(servers)
      .values({
        name: dto.name,
        description: dto.description,
        tenantId: activeTenantId,
        userId,
        nodeId: dto.nodeId,
        blueprintId: dto.blueprintId,
        image: blueprint.dockerImage,
        cpuLimitMillicores: dto.cpuLimitMillicores,
        memLimitMb: dto.memLimitMb,
        diskGb: dto.diskGb,
        status: 'installing',
        installStatus: 'pending',
      })
      .returning();

    // Enqueue install job
    await this.serverQueue.add('install-server', {
      serverId: server.id,
      blueprintId: dto.blueprintId,
      nodeId: dto.nodeId,
      cpuLimitMillicores: dto.cpuLimitMillicores,
      memLimitMb: dto.memLimitMb,
      diskLimitMb: dto.diskGb * 1024, // Convert GB to MB
      variables: blueprint.defaultVariables || {},
    });

    return server;
  }

  /**
   * Update server configuration (enqueues update job)
   */
  async update(userId: string, serverId: string, dto: UpdateServerDto) {
    const server = await this.findById(userId, serverId);

    // Update server record
    const [updated] = await this.dbConnection.db
      .update(servers)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(servers.id, serverId))
      .returning();

    // Enqueue update job if resource limits changed
    if (
      dto.cpuLimitMillicores ||
      dto.memLimitMb ||
      dto.diskGb
    ) {
      await this.serverQueue.add('update-server', {
        serverId,
        cpuLimitMillicores: dto.cpuLimitMillicores,
        memLimitMb: dto.memLimitMb,
        diskLimitMb: dto.diskGb ? dto.diskGb * 1024 : undefined,
      });
    }

    return updated;
  }

  /**
   * Delete server (enqueues delete job)
   */
  async remove(userId: string, serverId: string) {
    const server = await this.findById(userId, serverId);

    // Enqueue delete job
    await this.serverQueue.add('delete-server', {
      serverId,
    });

    return { success: true, message: 'Server deletion queued' };
  }

  /**
   * Execute power action on server
   */
  async powerAction(
    userId: string,
    serverId: string,
    action: 'start' | 'stop' | 'restart' | 'kill'
  ) {
    const server = await this.findById(userId, serverId);

    // Validate server is installed
    if (server.installStatus !== 'completed') {
      throw new BadRequestException('Server is not fully installed');
    }

    // Enqueue appropriate job based on action
    switch (action) {
      case 'start':
        await this.serverQueue.add('restart-server', {
          serverId,
          graceful: false,
        });
        await this.updateServerStatus(serverId, 'starting');
        break;

      case 'stop':
        await this.serverQueue.add('restart-server', {
          serverId,
          graceful: true,
        });
        await this.updateServerStatus(serverId, 'stopping');
        break;

      case 'restart':
        await this.serverQueue.add('restart-server', {
          serverId,
          graceful: true,
        });
        await this.updateServerStatus(serverId, 'stopping');
        break;

      case 'kill':
        await this.serverQueue.add('restart-server', {
          serverId,
          graceful: false,
        });
        await this.updateServerStatus(serverId, 'stopping');
        break;
    }

    return { success: true, action };
  }

  /**
   * Get server stats (proxy to Wings)
   */
  async getStats(userId: string, serverId: string) {
    const server = await this.findById(userId, serverId);

    // TODO: Fetch stats from Wings via HTTP
    // For now, return mock data
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkRx: 0,
      networkTx: 0,
      uptime: 0,
    };
  }

  /**
   * Helper: Verify tenant access
   */
  private async verifyTenantAccess(userId: string, tenantId: string) {
    const [membership] = await this.dbConnection.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    return membership;
  }

  /**
   * Helper: Update server status
   */
  private async updateServerStatus(
    serverId: string,
    status: 'offline' | 'starting' | 'online' | 'stopping' | 'installing' | 'failed'
  ) {
    await this.dbConnection.db
      .update(servers)
      .set({ status, updatedAt: new Date() })
      .where(eq(servers.id, serverId));
  }
}
