import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectDrizzle } from '../../common/database.module';
import type { NodeDatabase } from '@mambaPanel/db';
import { backups, servers, nodes, auditLogs, eq, and, desc } from '@mambaPanel/db';

/**
 * Backup Job Processor
 *
 * Handles backup operations:
 * - backup-server: Create a backup of a server's data and configuration
 * - restore-backup: Restore a server from a backup
 */

export interface BackupServerJobData {
  serverId: string;
  type: 'manual' | 'scheduled';
  retentionDays?: number;
}

export interface RestoreBackupJobData {
  backupId: string;
  serverId: string;
}

@Processor('backups')
export class BackupsProcessor extends WorkerHost {
  private readonly logger = new Logger(BackupsProcessor.name);

  constructor(@InjectDrizzle() private readonly db: NodeDatabase) {
    super();
  }

  async process(job: Job<BackupServerJobData | RestoreBackupJobData>) {
    const { name, data } = job;

    switch (name) {
      case 'backup-server':
        return this.backupServer(job as Job<BackupServerJobData>);
      case 'restore-backup':
        return this.restoreBackup(job as Job<RestoreBackupJobData>);
      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  }

  /**
   * Create a backup of a server
   *
   * Flow:
   * 1. Fetch server and node information
   * 2. Call Wings API to snapshot container volumes
   * 3. Compress the backup
   * 4. Upload to object storage (MinIO/S3)
   * 5. Record backup metadata in database
   * 6. Cleanup old backups based on retention policy
   */
  private async backupServer(job: Job<BackupServerJobData>) {
    const { serverId, type, retentionDays = 30 } = job.data;

    this.logger.log(`Creating ${type} backup for server ${serverId}`);

    try {
      // Step 1: Fetch server
      await job.updateProgress(5);
      const [server] = await this.db
        .select()
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (!server) {
        throw new Error(`Server ${serverId} not found`);
      }

      await this.logServerEvent(serverId, 'info', `Starting ${type} backup`);

      // Step 2: Fetch node
      const [node] = await this.db
        .select()
        .from(nodes)
        .where(eq(nodes.id, server.nodeId))
        .limit(1);

      if (!node) {
        throw new Error(`Node ${server.nodeId} not found`);
      }

      // Step 3: Create backup record
      await job.updateProgress(10);
      const backupSizeBytes = (Math.floor(Math.random() * 500) + 100) * 1024 * 1024; // Simulated size in bytes

      const [backup] = await this.db
        .insert(backups)
        .values({
          serverId,
          tenantId: server.tenantId,
          name: `${type}-backup-${new Date().toISOString()}`,
          status: 'in_progress',
          backupType: type,
          sizeBytes: null, // Will update after backup
          storagePath: `backups/${serverId}/${Date.now()}.tar.gz`,
        })
        .returning();

      this.logger.log(`Created backup record: ${backup.id}`);

      // Step 4: Call Wings API to snapshot volumes
      await job.updateProgress(20);
      await this.logServerEvent(serverId, 'info', 'Snapshotting container volumes');

      // TODO: Call Wings API
      // const wingsClient = new WingsClient(node.fqdn, node.apiPort);
      // const snapshot = await wingsClient.createSnapshot(serverId);

      this.logger.log(`[SIMULATED] Creating snapshot of server ${serverId}`);
      await this.sleep(3000);

      await job.updateProgress(40);

      // Step 5: Compress backup
      await this.logServerEvent(serverId, 'info', 'Compressing backup data');

      // TODO: Call Wings API to compress
      // await wingsClient.compressBackup(serverId, backup.id);

      this.logger.log(`[SIMULATED] Compressing backup ${backup.id}`);
      await this.sleep(5000);

      await job.updateProgress(60);

      // Step 6: Upload to object storage
      await this.logServerEvent(serverId, 'info', 'Uploading backup to storage');

      // TODO: Call object storage API (MinIO/S3)
      // const s3Client = new S3Client();
      // await s3Client.upload(backupPath, backup.storagePath);

      this.logger.log(`[SIMULATED] Uploading backup to object storage`);
      await this.sleep(7000);

      await job.updateProgress(80);

      // Step 7: Update backup record
      await this.db
        .update(backups)
        .set({
          status: 'completed',
          sizeBytes: backupSizeBytes,
          completedAt: new Date(),
        })
        .where(eq(backups.id, backup.id));

      const backupSizeMb = Math.round(backupSizeBytes / 1024 / 1024);
      await this.logServerEvent(serverId, 'success', `Backup created successfully (${backupSizeMb}MB)`);

      this.logger.log(`Backup ${backup.id} completed successfully`);

      await job.updateProgress(90);

      // Step 8: Cleanup old backups based on retention
      await this.cleanupOldBackups(serverId, retentionDays);

      await job.updateProgress(100);

      return {
        success: true,
        backupId: backup.id,
        sizeBytes: backupSizeBytes,
        storagePath: backup.storagePath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to backup server ${serverId}: ${errorMessage}`, errorStack);
      await this.logServerEvent(serverId, 'error', `Backup failed: ${errorMessage}`);

      // Mark backup as failed if it was created
      try {
        await this.db
          .update(backups)
          .set({ status: 'failed' })
          .where(and(eq(backups.serverId, serverId), eq(backups.status, 'in_progress')));
      } catch (updateError) {
        const updateErrorMessage = updateError instanceof Error ? updateError.message : 'Unknown error';
        this.logger.error(`Failed to update backup status: ${updateErrorMessage}`);
      }

      throw error;
    }
  }

  /**
   * Restore a server from a backup
   *
   * Flow:
   * 1. Fetch backup and server information
   * 2. Stop the server if running
   * 3. Download backup from object storage
   * 4. Extract backup to server volumes
   * 5. Restart server
   * 6. Verify health
   */
  private async restoreBackup(job: Job<RestoreBackupJobData>) {
    const { backupId, serverId } = job.data;

    this.logger.log(`Restoring backup ${backupId} to server ${serverId}`);

    try {
      // Step 1: Fetch backup
      await job.updateProgress(5);
      const [backup] = await this.db
        .select()
        .from(backups)
        .where(eq(backups.id, backupId))
        .limit(1);

      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      if (backup.status !== 'completed') {
        throw new Error(`Backup ${backupId} is not in completed status (current: ${backup.status})`);
      }

      // Step 2: Fetch server
      const [server] = await this.db
        .select()
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1);

      if (!server) {
        throw new Error(`Server ${serverId} not found`);
      }

      await this.logServerEvent(serverId, 'info', `Restoring from backup ${backupId}`);

      // Step 3: Fetch node
      const [node] = await this.db
        .select()
        .from(nodes)
        .where(eq(nodes.id, server.nodeId))
        .limit(1);

      // Step 4: Stop server if running
      if (server.status === 'online') {
        await job.updateProgress(10);
        await this.logServerEvent(serverId, 'info', 'Stopping server for restore');

        // TODO: Call Wings API to stop server
        // const wingsClient = new WingsClient(node.fqdn, node.apiPort);
        // await wingsClient.stopServer(serverId, false);

        this.logger.log(`[SIMULATED] Stopping server ${serverId}`);
        await this.sleep(2000);

        await this.db
          .update(servers)
          .set({ status: 'offline' })
          .where(eq(servers.id, serverId));
      }

      await job.updateProgress(20);

      // Step 5: Download backup from storage
      await this.logServerEvent(serverId, 'info', 'Downloading backup from storage');

      // TODO: Download from object storage
      // const s3Client = new S3Client();
      // await s3Client.download(backup.storagePath, localPath);

      this.logger.log(`[SIMULATED] Downloading backup from ${backup.storagePath}`);
      await this.sleep(5000);

      await job.updateProgress(40);

      // Step 6: Extract backup to volumes
      await this.logServerEvent(serverId, 'info', 'Extracting backup data');

      // TODO: Call Wings API to extract
      // await wingsClient.extractBackup(serverId, backupPath);

      this.logger.log(`[SIMULATED] Extracting backup ${backupId}`);
      await this.sleep(7000);

      await job.updateProgress(60);

      // Step 7: Start server
      await this.logServerEvent(serverId, 'info', 'Starting server');

      await this.db
        .update(servers)
        .set({ status: 'starting' })
        .where(eq(servers.id, serverId));

      // TODO: Call Wings API to start
      // await wingsClient.startServer(serverId);

      this.logger.log(`[SIMULATED] Starting server ${serverId}`);
      await this.sleep(2000);

      await job.updateProgress(80);

      // Step 8: Health check
      await this.logServerEvent(serverId, 'info', 'Verifying server health');

      const isHealthy = await this.pollHealthCheck(serverId, node.fqdn, 20, 3000);

      if (!isHealthy) {
        throw new Error(`Server ${serverId} failed health check after restore`);
      }

      await job.updateProgress(95);

      // Step 9: Mark server as online
      await this.db
        .update(servers)
        .set({ status: 'online' })
        .where(eq(servers.id, serverId));

      await this.logServerEvent(serverId, 'success', 'Backup restored successfully');

      this.logger.log(`Backup ${backupId} restored to server ${serverId} successfully`);

      await job.updateProgress(100);

      return {
        success: true,
        serverId,
        backupId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to restore backup ${backupId}: ${errorMessage}`, errorStack);
      await this.logServerEvent(serverId, 'error', `Restore failed: ${errorMessage}`);

      // Mark server as failed
      await this.db
        .update(servers)
        .set({ status: 'failed' })
        .where(eq(servers.id, serverId));

      throw error;
    }
  }

  /**
   * Cleanup old backups based on retention policy
   */
  private async cleanupOldBackups(serverId: string, retentionDays: number): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Find old backups
      const oldBackups = await this.db
        .select()
        .from(backups)
        .where(
          and(
            eq(backups.serverId, serverId),
            eq(backups.status, 'completed')
          )
        )
        .orderBy(desc(backups.createdAt));

      // Keep only the most recent backups within retention period
      const backupsToDelete = oldBackups.filter((b, index) => {
        const backupDate = new Date(b.createdAt);
        return backupDate < cutoffDate || index >= 10; // Keep max 10 backups
      });

      if (backupsToDelete.length === 0) {
        this.logger.log(`No old backups to cleanup for server ${serverId}`);
        return;
      }

      this.logger.log(`Cleaning up ${backupsToDelete.length} old backups for server ${serverId}`);

      for (const backup of backupsToDelete) {
        // TODO: Delete from object storage
        // const s3Client = new S3Client();
        // await s3Client.delete(backup.storagePath);

        this.logger.log(`[SIMULATED] Deleting backup ${backup.id} from storage`);

        // Delete from database
        await this.db.delete(backups).where(eq(backups.id, backup.id));
      }

      this.logger.log(`Cleaned up ${backupsToDelete.length} old backups`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to cleanup old backups: ${errorMessage}`, errorStack);
      // Don't throw - cleanup failure shouldn't fail the backup job
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
      // Use audit logs instead of server logs
      await this.db.insert(auditLogs).values({
        actorType: 'system',
        action: `server.${level}`,
        resourceType: 'server',
        resourceId: serverId,
        metadata: { message, level },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to log server event: ${errorMessage}`);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
