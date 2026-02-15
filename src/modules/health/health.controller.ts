import { PrismaService } from '#src/core/infrastructure/db/prisma/prisma.service.js';
import { RedisService } from '#src/core/infrastructure/redis/redis.service.js';
import { ResponseMessage } from '#src/core/presentation/http/decorators/response-message.decorator.js';
import { RateLimit } from '#src/core/presentation/http/security/rate-limit/rate-limit.decorators.js';
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @ResponseMessage('messages.common.ok')
  @RateLimit({ points: 2, durationSec: 10 })
  @Get('/health')
  async health() {
    // 1. Check Database (Simple query)
    await this.prisma.$queryRaw`SELECT 1`;

    // 2. Check Redis (Ping)
    await this.redis.raw().ping();

    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
