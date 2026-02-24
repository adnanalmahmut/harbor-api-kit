import {
  PrismaService,
  RateLimit,
  RedisService,
  ResponseMessage,
} from '#src/core/index.js';
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @ResponseMessage('messages.common.ok')
  @RateLimit({ points: 20, durationSec: 10 })
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
