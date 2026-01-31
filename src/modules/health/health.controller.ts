import { ResponseMessage } from '#src/infrastructure/http/decorators/response-message.decorator.js';
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @ResponseMessage('messages.common.ok')
  @Get('/health')
  health() {
    return { status: 'ok' };
  }
}
