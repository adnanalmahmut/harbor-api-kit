import { loggerConfig } from '#src/config/index.js';
import { Global, Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { createPinoOptions } from './pino-options.js';

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [loggerConfig.KEY],
      useFactory: (config: ConfigType<typeof loggerConfig>) => ({
        pinoHttp: createPinoOptions(config.level, config.pretty),
      }),
    }),
  ],
  exports: [LoggerModule],
})
export class LoggerSetupModule {}
