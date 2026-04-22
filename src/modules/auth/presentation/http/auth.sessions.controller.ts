import { ApiResponses, ResponseMessage } from '#src/core/index.js';
import {
  ListSessionsUseCase,
  RevokeOtherSessionsUseCase,
  RevokeSessionsUseCase,
  RevokeSessionUseCase,
} from '../../application/index.js';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from './auth.guard.js';
import { AUTH_RESPONSES } from './auth.http.js';
import { AuthHttpSupport } from './auth.http.support.js';
import { RevokeSessionDto, RevokeSessionsDto } from './dtos/index.js';

@Controller('auth')
export class AuthSessionsController {
  constructor(
    private readonly support: AuthHttpSupport,
    private readonly listSessionsUseCase: ListSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly revokeSessionsUseCase: RevokeSessionsUseCase,
    private readonly revokeOtherSessionsUseCase: RevokeOtherSessionsUseCase,
  ) {}

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.listSessions)
  @ResponseMessage('auth.messages.list_sessions_success')
  @Get('/list-sessions')
  async listSessions() {
    const context = this.support.requireContext();
    const result = await this.listSessionsUseCase.execute(context);
    return result.data;
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.revokeSession)
  @ResponseMessage('auth.messages.revoke_session_success')
  @Post('/revoke-session')
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Body() body: RevokeSessionDto) {
    const context = this.support.requireContext();
    const result = await this.revokeSessionUseCase.execute(
      body.sessionId,
      context,
    );
    return result.data;
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.revokeSessions)
  @ResponseMessage('auth.messages.revoke_sessions_success')
  @Post('/revoke-sessions')
  @HttpCode(HttpStatus.OK)
  async revokeSessions(@Body() body: RevokeSessionsDto) {
    const context = this.support.requireContext();
    const result = await this.revokeSessionsUseCase.execute(
      body.sessionIds,
      context,
    );
    return result.data;
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.revokeOtherSessions)
  @ApiConsumes('application/json')
  @ApiBody({ required: false, schema: { type: 'object', properties: {} } })
  @ResponseMessage('auth.messages.revoke_other_sessions_success')
  @Post('/revoke-other-sessions')
  @HttpCode(HttpStatus.OK)
  async revokeOtherSessions() {
    const context = this.support.requireContext();
    const result = await this.revokeOtherSessionsUseCase.execute(context);
    return result.data;
  }
}
