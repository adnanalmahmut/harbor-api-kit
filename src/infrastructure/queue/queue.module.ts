import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { redisConfig } from '#src/config/index.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigType<typeof redisConfig>) => ({
        connection: {
          url: config.url,
        },
        prefix: `{${config.prefix}:bmq}`,
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
      inject: [redisConfig.KEY],
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
