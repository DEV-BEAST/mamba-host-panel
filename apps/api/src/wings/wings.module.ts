import { Module } from '@nestjs/common';
import { WingsService } from './wings.service';
import { WingsController } from './wings.controller';

@Module({
  providers: [WingsService],
  controllers: [WingsController],
  exports: [WingsService],
})
export class WingsModule {}
