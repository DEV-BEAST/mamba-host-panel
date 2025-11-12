import { Module } from '@nestjs/common';
import { TrpcRouter } from './trpc.router';
import { TrpcService } from './trpc.service';
import { UsersModule } from '../users/users.module';
import { ServersModule } from '../servers/servers.module';

@Module({
  imports: [UsersModule, ServersModule],
  providers: [TrpcService, TrpcRouter],
  exports: [TrpcService, TrpcRouter],
})
export class TrpcModule {}
