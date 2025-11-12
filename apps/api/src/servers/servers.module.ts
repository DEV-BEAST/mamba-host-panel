import { Module } from '@nestjs/common';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';
import { ServersGateway } from './servers.gateway';
import { WingsModule } from '../wings/wings.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [WingsModule, TenantsModule],
  providers: [ServersService, ServersGateway],
  controllers: [ServersController],
  exports: [ServersService],
})
export class ServersModule {}
