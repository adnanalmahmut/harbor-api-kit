import { ApiErrors } from '#src/infrastructure/http/decorators/api-errors.decorator.js';
import { ResponseMessage } from '#src/infrastructure/http/decorators/response-message.decorator.js';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { PlaygroundSignupDto } from './dtos/playground-signup.dto.js';

@Controller('playground')
export class PlaygroundController {
  constructor() {}

  @Get('ok')
  @ApiErrors(['VALIDATION_ERROR', 'CONFLICT', 'UNAUTHORIZED'])
  @ResponseMessage('messages.common.ok')
  ok() {
    return { hello: 'world' };
  }

  @Post('dto-validation-global')
  @ResponseMessage('messages.common.ok')
  dtoValidationGlobal(@Body() dto: PlaygroundSignupDto) {
    return { received: dto };
  }
}
