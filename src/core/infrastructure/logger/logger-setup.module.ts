import { AppConfigModule } from '#src/core/infrastructure/config/app-config.module.js';
import { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import { createPinoOptions } from '#src/core/infrastructure/logger/pino-options.js';
import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

@Global()
@Module({
  imports: [
    AppConfigModule,
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
  exports: [LoggerModule],
})
export class LoggerSetupModule {}
