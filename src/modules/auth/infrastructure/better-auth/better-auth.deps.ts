import type {
  AppConfigService,
  PrismaService,
  RedisService,
} from '#src/core/index.js';
import type { PinoLogger } from 'nestjs-pino';
import type { BetterAuthInstance } from './auth.js';

export interface BetterAuthDeps {
  auth: BetterAuthInstance;
  prisma: PrismaService;
  config: AppConfigService;
  redisService: RedisService;
  logger: PinoLogger;
}
