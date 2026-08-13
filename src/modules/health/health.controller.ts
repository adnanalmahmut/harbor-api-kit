import { ResponseMessage } from '#src/common/response.interceptor.js';
import { RateLimit } from '#src/infrastructure/rate-limit/rate-limit.decorators.js';
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ResponseMessage('messages.common.ok')
  @RateLimit({ points: 20, durationSec: 10 })
  @Get('/health')
  async health() {
    return this.healthService.check();
  }
}
