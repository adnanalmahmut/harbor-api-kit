import {
  ApiResponses,
  AuthRedirectInterceptor,
  RateLimit,
  RedirectOnResult,
  ResponseMessage,
} from '#src/core/index.js';
import {
  AuthException,
  ChangePasswordUseCase,
  CheckResetTokenUseCase,
  ForgetPasswordUseCase,
  ResetPasswordUseCase,
  VerifyPasswordUseCase,
} from '../../application/index.js';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthGuard } from './auth.guard.js';
import { applyCookies, AUTH_RESPONSES } from './auth.http.js';
import { AuthHttpSupport } from './auth.http.support.js';
import {
  ChangePasswordDto,
  ForgetPasswordDto,
  ResetPasswordDto,
  VerifyPasswordDto,
} from './dtos/index.js';

@Controller('auth')
export class AuthPasswordController {
  constructor(
    private readonly support: AuthHttpSupport,
    private readonly forgetPasswordUseCase: ForgetPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly verifyPasswordUseCase: VerifyPasswordUseCase,
    private readonly checkResetTokenUseCase: CheckResetTokenUseCase,
  ) {}

  @ApiResponses(AUTH_RESPONSES.forgotPassword)
  @ResponseMessage('auth.messages.forget_password_success')
  @RateLimit({ points: 5, durationSec: 300 })
  @Post('/forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgetPassword(
    @Body() body: ForgetPasswordDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const context = this.support.requireContext();
    const result = await this.forgetPasswordUseCase.execute({
      email: body.email,
      context,
    });

    applyCookies(reply, result.cookies);
    return result.data;
  }

  @ApiResponses(AUTH_RESPONSES.checkResetToken)
  @Get('/reset-password/:token')
  @UseInterceptors(AuthRedirectInterceptor)
  @RedirectOnResult({
    successPath: '/reset-password',
    errorPath: '/auth/error',
    errorReason: 'invalid_reset_token',
    tokenParam: 'token',
  })
  async checkResetToken(@Param('token') token: string) {
    const result = await this.checkResetTokenUseCase.execute(token);
    if (!result.data) {
      throw AuthException.invalidToken();
    }
    return { valid: true };
  }

  @ApiResponses(AUTH_RESPONSES.resetPassword)
  @ResponseMessage('auth.messages.reset_password_success')
  @Post('/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const context = this.support.requireContext();
    const result = await this.resetPasswordUseCase.execute({
      token: body.token,
      newPassword: body.newPassword,
      context,
    });

    applyCookies(reply, result.cookies);
    return result.data;
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.verifyPassword)
  @ResponseMessage('auth.messages.verify_password_success')
  @Post('/verify-password')
  @HttpCode(HttpStatus.OK)
  async verifyPassword(@Body() body: VerifyPasswordDto) {
    const context = this.support.requireContext();
    const result = await this.verifyPasswordUseCase.execute(
      body.password,
      context,
    );
    return { valid: result.data };
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.changePassword)
  @ResponseMessage('auth.messages.change_password_success')
  @Post('/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const context = this.support.requireContext();
    const result = await this.changePasswordUseCase.execute({
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      revokeOtherSessions: body.revokeOtherSessions,
      context,
    });

    applyCookies(reply, result.cookies);
    return result.data;
  }
}
