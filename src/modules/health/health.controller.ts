import { RateLimit } from '#src/infrastructure/security/rate-limit/rate-limit.decorators.js';
import { ResponseMessage } from '#src/shared/http/decorators/response-message.decorator.js';
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
