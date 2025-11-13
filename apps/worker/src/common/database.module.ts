import { Module, Global, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabaseConnection } from '@mambaPanel/db';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

/**
 * Decorator to inject the Drizzle database instance
 */
export const InjectDrizzle = () => Inject(DATABASE_CONNECTION);

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw new Error('DATABASE_URL is not defined');
        }
        const { db } = createDatabaseConnection(connectionString);
        return db;
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
