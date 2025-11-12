import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { ServersModule } from './servers/servers.module';
import { NodesModule } from './nodes/nodes.module';
import { BackupsModule } from './backups/backups.module';
import { MetricsModule } from './metrics/metrics.module';
import { AuditModule } from './audit/audit.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { WingsModule } from './wings/wings.module';
import { TrpcModule } from './trpc/trpc.module';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './common/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),
    DatabaseModule,
    RedisModule,
    QueueModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    ServersModule,
    NodesModule,
    BackupsModule,
    MetricsModule,
    AuditModule,
    BillingModule,
    AdminModule,
    WingsModule,
    TrpcModule,
  ],
})
export class AppModule {}
