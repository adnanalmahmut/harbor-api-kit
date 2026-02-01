import { ResponseMessage } from '#src/infrastructure/http/decorators/response-message.decorator.js';
import { RateLimit } from '#src/infrastructure/security/rate-limit/rate-limit.decorators.js';
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @ResponseMessage('messages.common.ok')
  @RateLimit({ points: 2, durationSec: 10 })
  @Get('/health')
  health() {
    return { status: 'ok' };
  }
}
