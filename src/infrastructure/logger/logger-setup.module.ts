import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { createPinoOptions } from '#src/infrastructure/logger/pino-options.js';
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: createPinoOptions(
          config.logger().level,
          config.logger().pretty,
        ),
      }),
    }),
  ],
})
export class LoggerSetupModule {}
