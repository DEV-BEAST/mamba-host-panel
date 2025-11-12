import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../queues/queue-names';
import { ServersProcessor } from './servers.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.SERVERS,
    }),
  ],
  providers: [ServersProcessor],
  exports: [BullModule],
})
export class ServersModule {}
