import { getRequestContext } from '#src/infrastructure/context/request-context.manager.js';
import { stripQuery } from '#src/infrastructure/validation/http.utils.js';
import type { LevelWithSilent } from 'pino';
import type { Options } from 'pino-http';

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
      path: stripQuery(req.url), // Single source of truth for path cleaning
      isError: res.statusCode >= 500,
      isClientError: res.statusCode >= 400 && res.statusCode < 500,
    }),
    serializers: {
      req: () => ({}), // Quiet standard req/res logs
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
