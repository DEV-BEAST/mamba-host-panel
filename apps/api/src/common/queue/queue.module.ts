import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const SERVER_QUEUE = 'SERVER_QUEUE';
export const BACKUP_QUEUE = 'BACKUP_QUEUE';
export const METRICS_QUEUE = 'METRICS_QUEUE';

@Global()
@Module({
  providers: [
    {
      provide: SERVER_QUEUE,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const connection = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
        });

        return new Queue('servers', { connection });
      },
      inject: [ConfigService],
    },
    {
      provide: BACKUP_QUEUE,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const connection = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
        });

        return new Queue('backups', { connection });
      },
      inject: [ConfigService],
    },
    {
      provide: METRICS_QUEUE,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const connection = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
        });

        return new Queue('metrics', { connection });
      },
      inject: [ConfigService],
    },
  ],
  exports: [SERVER_QUEUE, BACKUP_QUEUE, METRICS_QUEUE],
})
export class QueueModule {}
