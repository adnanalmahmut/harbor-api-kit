import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (config: AppConfigService) => ({
        connection: {
          url: config.redis().url,
          // Extract host/port if URL parsing is needed for BullMQ?
          // BullMQ/ioredis supports 'url'.
          // "ioredis" is the underlying client.
        },
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
      inject: [AppConfigService],
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
