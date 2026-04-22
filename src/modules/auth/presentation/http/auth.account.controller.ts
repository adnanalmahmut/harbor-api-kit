import {
  ApiResponses,
  AuthRedirectInterceptor,
  RateLimit,
  RedirectOnResult,
  ResponseMessage,
} from '#src/core/index.js';
import {
  ChangeEmailUseCase,
  DeleteUserUseCase,
  ReactivateUserUseCase,
  SendVerificationEmailUseCase,
  UpdateUserUseCase,
  VerifyEmailUseCase,
} from '../../application/index.js';
import { Roles } from '#src/modules/rbac/index.js';
import { RbacGuard } from '#src/modules/rbac/index.js';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { AuthGuard } from './auth.guard.js';
import { applyCookies, AUTH_RESPONSES } from './auth.http.js';
import { AuthHttpSupport } from './auth.http.support.js';
import {
  ChangeEmailDto,
  ReactivateUserDto,
  SendVerificationEmailDto,
  UpdateUserDto,
  VerifyEmailDto,
} from './dtos/index.js';

@Controller('auth')
export class AuthAccountController {
  constructor(
    private readonly support: AuthHttpSupport,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly sendVerificationEmailUseCase: SendVerificationEmailUseCase,
    private readonly changeEmailUseCase: ChangeEmailUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly reactivateUserUseCase: ReactivateUserUseCase,
  ) {}

  @ApiResponses(AUTH_RESPONSES.verifyEmail)
  @Get('/verify-email')
  @UseInterceptors(AuthRedirectInterceptor)
  @RedirectOnResult({
    successPath: '/email-verified',
    errorPath: '/auth/error',
    errorReason: 'invalid_verification_token',
  })
  async verifyEmailLink(
    @Query() query: VerifyEmailDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const context = this.support.requireContext();
    const result = await this.verifyEmailUseCase.execute({
      token: query.token,
      context,
    });
    applyCookies(reply, result.cookies);
    return result.data;
  }

  @ApiResponses(AUTH_RESPONSES.sendVerificationEmail)
  @ResponseMessage('auth.messages.send_verification_email_success')
  @RateLimit({ points: 5, durationSec: 300 })
  @Post('/send-verification-email')
  @HttpCode(HttpStatus.OK)
  async sendVerificationEmail(@Body() body: SendVerificationEmailDto) {
    const context = this.support.requireContext();
    const result = await this.sendVerificationEmailUseCase.execute(
      body.email,
      context,
    );
    return result.data;
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.changeEmail)
  @ResponseMessage('auth.messages.send_change_email_success')
  @Post('/change-email')
  @HttpCode(HttpStatus.OK)
  async changeEmail(
    @Body() body: ChangeEmailDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const context = this.support.requireContext();
    this.support.validateCallbackURL(body.callbackURL);
    const result = await this.changeEmailUseCase.execute({
      newEmail: body.newEmail,
      callbackURL: body.callbackURL,
      context,
    });

    applyCookies(reply, result.cookies);
    return result.data;
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.updateUser)
  @ResponseMessage('auth.messages.update_user_success')
  @Post('/update-user')
  @HttpCode(HttpStatus.OK)
  async updateUser(@Body() body: UpdateUserDto) {
    const context = this.support.requireContext();
    const result = await this.updateUserUseCase.execute(body, context);
    return result.data;
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.deleteUser)
  @ApiConsumes('application/json')
  @ApiBody({ required: false, schema: { type: 'object', properties: {} } })
  @ResponseMessage('auth.messages.delete_user_success')
  @Post('/delete-user')
  @HttpCode(HttpStatus.OK)
  async deleteUser() {
    const context = this.support.requireContext();
    const result = await this.deleteUserUseCase.execute(context);
    return result.data;
  }

  @UseGuards(AuthGuard, RbacGuard)
  @Roles(['admin'])
  @ApiResponses(AUTH_RESPONSES.reactivateUser)
  @ResponseMessage('auth.messages.reactivate_user_success')
  @Post('/reactivate-user')
  async reactivateUser(@Body() dto: ReactivateUserDto): Promise<void> {
    await this.reactivateUserUseCase.execute(dto.email);
  }
}
