import { stripQuery } from '#src/core/domain/utils/shared.utils.js';
import { getRequestContextStatic } from '#src/core/infrastructure/context/request-context-storage.js';
import type { LevelWithSilent } from 'pino';
import type { Options } from 'pino-http';

export function createPinoOptions(
  level: LevelWithSilent,
  pretty: boolean,
): Options {
  return {
    level,
    mixin: () => {
      const ctx = getRequestContextStatic();
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
