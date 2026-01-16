import { ResponseMessage } from '#src/infrastructure/http/decorators/response-message.decorator.js';
import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller()
export class HealthController {
  @ResponseMessage('messages.common.ok')
  @Get('/health')
  health() {
    return { status: 'ok' };
  }

  /**
   * Chrome DevTools (and some Chromium-based tooling) may probe this well-known path automatically
   * when opening deep links (e.g., /documentation#...).
   *
   * We intentionally return 204 to avoid noisy 404 logs. This endpoint is not part of the public API.
   */
  @Get('.well-known/appspecific/com.chrome.devtools.json')
  @HttpCode(204)
  handle() {
    return;
  }
}
