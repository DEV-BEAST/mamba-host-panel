import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../queues/queue-names';
import { MetricsProcessor } from './metrics.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.METRICS,
    }),
  ],
  providers: [MetricsProcessor],
  exports: [BullModule],
})
export class MetricsModule {}
