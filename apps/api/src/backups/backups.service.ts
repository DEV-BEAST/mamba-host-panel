import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../common/database/database.module';
import { BACKUP_QUEUE } from '../common/queue/queue.module';
import { backups, servers } from '@mambaPanel/db';
import { eq, and } from 'drizzle-orm';
import type { Database } from '@mambaPanel/db';
import type { Queue } from 'bullmq';
import { ServersService } from '../servers/servers.service';

@Injectable()
export class BackupsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private dbConnection: { db: Database },
    @Inject(BACKUP_QUEUE)
    private backupQueue: Queue,
    private serversService: ServersService
  ) {}

  /**
   * Get all backups for a server
   */
  async findAll(userId: string, serverId: string) {
    // Verify server access
    await this.serversService.findById(userId, serverId);

    return this.dbConnection.db
      .select()
      .from(backups)
      .where(eq(backups.serverId, serverId));
  }

  /**
   * Get backup by ID
   */
  async findById(userId: string, serverId: string, backupId: string) {
    // Verify server access
    await this.serversService.findById(userId, serverId);

    const [backup] = await this.dbConnection.db
      .select()
      .from(backups)
      .where(
        and(eq(backups.id, backupId), eq(backups.serverId, serverId))
      )
      .limit(1);

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    return backup;
  }

  /**
   * Create a new backup (enqueue job)
   */
  async create(userId: string, serverId: string) {
    // Verify server access
    const server = await this.serversService.findById(userId, serverId);

    // Create backup record
    const [backup] = await this.dbConnection.db
      .insert(backups)
      .values({
        serverId,
        status: 'pending',
      })
      .returning();

    // Enqueue backup job
    await this.backupQueue.add('backup-server', {
      serverId,
      backupId: backup.id,
    });

    return backup;
  }

  /**
   * Restore a backup (enqueue job)
   */
  async restore(userId: string, serverId: string, backupId: string) {
    const backup = await this.findById(userId, serverId, backupId);

    if (backup.status !== 'completed') {
      throw new ForbiddenException('Backup is not completed');
    }

    // Enqueue restore job
    await this.backupQueue.add('restore-backup', {
      serverId,
      backupId,
      s3Key: backup.s3Key,
    });

    return { success: true, message: 'Restore queued' };
  }

  /**
   * Delete a backup
   */
  async remove(userId: string, serverId: string, backupId: string) {
    const backup = await this.findById(userId, serverId, backupId);

    // Delete backup record
    await this.dbConnection.db
      .delete(backups)
      .where(eq(backups.id, backupId));

    // TODO: Delete from S3

    return { success: true };
  }
}
