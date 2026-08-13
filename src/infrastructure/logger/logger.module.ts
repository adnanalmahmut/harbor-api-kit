import { getRequestContext } from '#src/common/request-context.js';
import { stripQuery } from '#src/common/utils.js';
import { loggerConfig } from '#src/config/index.js';
import { Global, Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { LevelWithSilent } from 'pino';
import type { Options } from 'pino-http';

/**
 * The mixin stamps every log line with the correlation fields from the current
 * request context.
 */
export function createPinoOptions(
  level: LevelWithSilent,
  pretty: boolean,
): Options {
  return {
    level,
    mixin: () => {
      const ctx = getRequestContext();
      if (!ctx) return {};
      return {
        requestId: ctx.requestId,
        userId: ctx.userId,
        locale: ctx.locale,
      };
    },
    customProps: (req, res) => ({
      statusCode: res.statusCode,
      method: req.method,
      path: stripQuery(req.url),
      isError: res.statusCode >= 500,
      isClientError: res.statusCode >= 400 && res.statusCode < 500,
    }),
    serializers: {
      req: () => ({}),
      res: () => ({}),
    },
    transport: pretty
      ? {
          target: 'pino-pretty',
          options: { singleLine: true, translateTime: 'SYS:standard' },
        }
      : undefined,
  };
}

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [loggerConfig.KEY],
      useFactory: (config: ConfigType<typeof loggerConfig>) => ({
        pinoHttp: createPinoOptions(config.level, config.pretty),
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
