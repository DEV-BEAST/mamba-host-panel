import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../queues/queue-names';
import { BackupsProcessor } from './backups.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.BACKUPS,
    }),
  ],
  providers: [BackupsProcessor],
  exports: [BullModule],
})
export class BackupsModule {}
