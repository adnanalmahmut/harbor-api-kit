import { RateLimit, ResponseMessage } from '#src/core/presentation/index.js';
import { Controller, Get } from '@nestjs/common';
import { HealthCheckerService } from '../../application/health-checker.service.js';

@Controller()
export class HealthController {
  constructor(private readonly healthChecker: HealthCheckerService) {}

  @ResponseMessage('messages.common.ok')
  @RateLimit({ points: 20, durationSec: 10 })
  @Get('/health')
  async health() {
    return this.healthChecker.check();
  }
}
