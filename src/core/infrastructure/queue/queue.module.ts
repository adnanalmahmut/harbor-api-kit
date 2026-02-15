import { AppConfigModule } from '#src/core/infrastructure/config/app-config.module.js';
import { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (config: AppConfigService) => ({
        connection: {
          url: config.redis().url,
        },
        prefix: `{${config.redis().prefix}:bmq}`,
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
