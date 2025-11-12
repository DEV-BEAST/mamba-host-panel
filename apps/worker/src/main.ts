import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const logger = app.get(Logger);
  logger.log('Worker service starting...');

  // Worker doesn't need HTTP server, just job processing
  await app.init();

  logger.log('Worker service is ready to process jobs');
}

bootstrap();
