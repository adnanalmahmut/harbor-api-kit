import type { appConfig, i18nConfig } from '#src/config/index.js';
import type { PrismaService, RedisService } from '#src/core/index.js';
import type { ConfigType } from '@nestjs/config';
import type { PinoLogger } from 'nestjs-pino';
import type { BetterAuthInstance } from './auth.js';

export interface BetterAuthDeps {
  auth: BetterAuthInstance;
  prisma: PrismaService;
  appConfig: ConfigType<typeof appConfig>;
  i18nConfig: ConfigType<typeof i18nConfig>;
  redisService: RedisService;
  logger: PinoLogger;
}
