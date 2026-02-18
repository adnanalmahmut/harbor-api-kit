import { CORE_TOKENS } from '#src/core/core.tokens.js';
import type { RequestContext } from '#src/core/domain/context/request-context.type.js';
import type { RequestContextStorePort } from '#src/core/domain/ports/request-context.store.port.js';
import {
  assertAllowedRedirectURL,
  InvalidRedirectURLError,
} from '#src/core/domain/utils/url-validation.utils.js';
import { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import { ApiResponses } from '#src/core/presentation/http/decorators/api-errors.decorator.js';
import { ResponseMessage } from '#src/core/presentation/http/decorators/response-message.decorator.js';
import {
  AuthRedirectInterceptor,
  RedirectOnResult,
} from '#src/core/presentation/http/interceptors/auth-redirect.interceptor.js';
import { makeCsrfToken } from '#src/core/presentation/http/security/csrf/csrf.util.js';
import { RateLimit } from '#src/core/presentation/http/security/rate-limit/rate-limit.decorators.js';
import { AuthException } from '#src/modules/auth/application/exceptions/auth.exception.js';
import { ChangeEmailUseCase } from '#src/modules/auth/application/use-cases/change-email.use-case.js';
import { ChangePasswordUseCase } from '#src/modules/auth/application/use-cases/change-password.use-case.js';
import { CheckResetTokenUseCase } from '#src/modules/auth/application/use-cases/check-reset-token.use-case.js';
import { DeleteUserUseCase } from '#src/modules/auth/application/use-cases/delete-user.use-case.js';
import { ForgetPasswordUseCase } from '#src/modules/auth/application/use-cases/forget-password.use-case.js';
import { GetSessionUseCase } from '#src/modules/auth/application/use-cases/get-session.use-case.js';
import { LinkSocialUseCase } from '#src/modules/auth/application/use-cases/link-social.use-case.js';
import { ListLinkedAccountsUseCase } from '#src/modules/auth/application/use-cases/list-linked-accounts.use-case.js';
import { ListSessionsUseCase } from '#src/modules/auth/application/use-cases/list-sessions.use-case.js';
import { LoginUserUseCase } from '#src/modules/auth/application/use-cases/login-user.use-case.js';
import { ReactivateUserUseCase } from '#src/modules/auth/application/use-cases/reactivate-user.use-case.js';
import { RegisterUserUseCase } from '#src/modules/auth/application/use-cases/register-user.use-case.js';
import { ResetPasswordUseCase } from '#src/modules/auth/application/use-cases/reset-password.use-case.js';
import { RevokeOtherSessionsUseCase } from '#src/modules/auth/application/use-cases/revoke-other-sessions.use-case.js';
import { RevokeSessionUseCase } from '#src/modules/auth/application/use-cases/revoke-session.use-case.js';
import { RevokeSessionsUseCase } from '#src/modules/auth/application/use-cases/revoke-sessions.use-case.js';
import { SendVerificationEmailUseCase } from '#src/modules/auth/application/use-cases/send-verification-email.use-case.js';
import { SignInSocialUseCase } from '#src/modules/auth/application/use-cases/sign-in-social.use-case.js';
import { SignOutUseCase } from '#src/modules/auth/application/use-cases/sign-out.use-case.js';
import { UnlinkAccountUseCase } from '#src/modules/auth/application/use-cases/unlink-account.use-case.js';
import { UpdateUserUseCase } from '#src/modules/auth/application/use-cases/update-user.use-case.js';
import { VerifyEmailUseCase } from '#src/modules/auth/application/use-cases/verify-email.use-case.js';
import { VerifyPasswordUseCase } from '#src/modules/auth/application/use-cases/verify-password.use-case.js';
import { AUTH_TOKENS } from '#src/modules/auth/auth.tokens.js';
import type { AuthProviderPort } from '#src/modules/auth/domain/ports/auth-provider.port.js';
import { AUTH_RESPONSES } from '#src/modules/auth/presentation/http/api-responses.examples.js';
import { applyCookies } from '#src/modules/auth/presentation/http/cookie.serializer.js';
import { ChangeEmailDto } from '#src/modules/auth/presentation/http/dtos/change-email.dto.js';
import { ChangePasswordDto } from '#src/modules/auth/presentation/http/dtos/change-password.dto.js';
import { ForgetPasswordDto } from '#src/modules/auth/presentation/http/dtos/forget-password.dto.js';
import { LoginDto } from '#src/modules/auth/presentation/http/dtos/login.dto.js';
import { ReactivateUserDto } from '#src/modules/auth/presentation/http/dtos/reactivate-user.dto.js';
import { RegisterDto } from '#src/modules/auth/presentation/http/dtos/register.dto.js';
import { ResetPasswordDto } from '#src/modules/auth/presentation/http/dtos/reset-password.dto.js';
import { RevokeSessionDto } from '#src/modules/auth/presentation/http/dtos/revoke-session.dto.js';
import { RevokeSessionsDto } from '#src/modules/auth/presentation/http/dtos/revoke-sessions.dto.js';
import { SendVerificationEmailDto } from '#src/modules/auth/presentation/http/dtos/send-verification-email.dto.js';
import {
  LinkSocialDto,
  SignInSocialDto,
  UnlinkAccountDto,
} from '#src/modules/auth/presentation/http/dtos/social-auth.dto.js';
import { UpdateUserDto } from '#src/modules/auth/presentation/http/dtos/update-user.dto.js';
import { VerifyEmailDto } from '#src/modules/auth/presentation/http/dtos/verify-email.dto.js';
import { VerifyPasswordDto } from '#src/modules/auth/presentation/http/dtos/verify-password.dto.js';
import { AuthGuard } from '#src/modules/auth/presentation/http/guards/auth.guard.js';
import { Roles } from '#src/modules/rbac/presentation/http/decorators/roles.decorator.js';
import { RbacGuard } from '#src/modules/rbac/presentation/http/guards/rbac.guard.js';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUserUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly forgetPasswordUseCase: ForgetPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly changeEmailUseCase: ChangeEmailUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly signOutUseCase: SignOutUseCase,
    private readonly listSessionsUseCase: ListSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly revokeSessionsUseCase: RevokeSessionsUseCase,
    private readonly revokeOtherSessionsUseCase: RevokeOtherSessionsUseCase,
    private readonly sendVerificationEmailUseCase: SendVerificationEmailUseCase,
    private readonly verifyPasswordUseCase: VerifyPasswordUseCase,
    private readonly checkResetTokenUseCase: CheckResetTokenUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly reactivateUserUseCase: ReactivateUserUseCase,
    private readonly signInSocialUseCase: SignInSocialUseCase,
    private readonly linkSocialUseCase: LinkSocialUseCase,
    private readonly listLinkedAccountsUseCase: ListLinkedAccountsUseCase,
    private readonly unlinkAccountUseCase: UnlinkAccountUseCase,
    @Inject(CORE_TOKENS.REQUEST_CONTEXT_STORE)
    private readonly contextStore: RequestContextStorePort,
    @Inject(AUTH_TOKENS.AUTH_PROVIDER)
    private readonly authProvider: AuthProviderPort,
    private readonly config: AppConfigService,
  ) {}

  private requireContext(): RequestContext {
    const ctx = this.contextStore.get();
    if (!ctx) throw AuthException.internalError();
    return ctx;
  }

  private validateCallbackURL(url?: string): void {
    try {
      const frontendUrl = this.config.frontend().url;
      const trustedOrigins = this.config.cors().trustedOrigins;
      assertAllowedRedirectURL(url, [frontendUrl, ...trustedOrigins]);
    } catch (e) {
      if (e instanceof InvalidRedirectURLError) {
        throw AuthException.invalidRequest();
      }
      throw e;
    }
  }

  private issueCsrfCookie(reply: FastifyReply) {
    const csrf = this.config.csrf();
    if (!csrf.enabled) return;

    const token = makeCsrfToken();
    reply.setCookie(csrf.cookieName, token, {
      httpOnly: false,
      secure: csrf.cookieSecure,
      sameSite: csrf.sameSite,
      path: '/',
    });
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.signOut)
  @ApiBody({ required: false, schema: { type: 'object', properties: {} } })
  @Post('/sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(@Res({ passthrough: true }) reply: FastifyReply) {
    const context = this.requireContext();
    const result = await this.signOutUseCase.execute({ context });
    applyCookies(reply, result.cookies);
    return;
  }

  @ApiResponses(AUTH_RESPONSES.register)
  @ResponseMessage('auth.messages.register_success')
  @Post('/register')
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const context = this.requireContext();
    const result = await this.registerUseCase.execute({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      context,
    });

    applyCookies(reply, result.cookies);
    this.issueCsrfCookie(reply);
    return result.data;
  }

  @ApiResponses(AUTH_RESPONSES.login)
  @RateLimit({ points: 5, durationSec: 60 })
  @Post('/login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('auth.messages.login_success')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const context = this.requireContext();
    this.validateCallbackURL(body.callbackURL);
    const result = await this.loginUseCase.execute({
      email: body.email,
      password: body.password,
      rememberMe: body.rememberMe,
      redirect: body.redirect,
      callbackURL: body.callbackURL,
      context,
    });

    applyCookies(reply, result.cookies);
    this.issueCsrfCookie(reply);
    return result.data;
  }

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
    const context = this.requireContext();
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
    const context = this.requireContext();
    const result = await this.sendVerificationEmailUseCase.execute(
      body.email,
      context,
    );
    return result.data;
  }

  @ApiResponses(AUTH_RESPONSES.forgotPassword)
  @ResponseMessage('auth.messages.forget_password_success')
  @RateLimit({ points: 5, durationSec: 300 })
  @Post('/forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgetPassword(
    @Body() body: ForgetPasswordDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const context = this.requireContext();
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
    const context = this.requireContext();
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
    const context = this.requireContext();
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
    const context = this.requireContext();
    const result = await this.changePasswordUseCase.execute({
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      revokeOtherSessions: body.revokeOtherSessions,
      context,
    });

    applyCookies(reply, result.cookies);
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
    const context = this.requireContext();
    this.validateCallbackURL(body.callbackURL);
    const result = await this.changeEmailUseCase.execute({
      newEmail: body.newEmail,
      callbackURL: body.callbackURL,
      context,
    });

    applyCookies(reply, result.cookies);
    return result.data;
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.listSessions)
  @ResponseMessage('auth.messages.list_sessions_success')
  @Get('/list-sessions')
  async listSessions() {
    const context = this.requireContext();
    const result = await this.listSessionsUseCase.execute(context);
    return result.data;
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.revokeSession)
  @ResponseMessage('auth.messages.revoke_session_success')
  @Post('/revoke-session')
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Body() body: RevokeSessionDto) {
    const context = this.requireContext();
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
    const context = this.requireContext();
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
    const context = this.requireContext();
    const result = await this.revokeOtherSessionsUseCase.execute(context);
    return result.data;
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.updateUser)
  @ResponseMessage('auth.messages.update_user_success')
  @Post('/update-user')
  @HttpCode(HttpStatus.OK)
  async updateUser(@Body() body: UpdateUserDto) {
    const context = this.requireContext();
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
    const context = this.requireContext();
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

  @ApiResponses(AUTH_RESPONSES.socialSignIn)
  @ResponseMessage('auth.messages.redirect')
  @Post('/sign-in/social')
  async signInSocial(
    @Body() dto: SignInSocialDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<any> {
    const context = this.requireContext();
    this.validateCallbackURL(dto.callbackURL);
    const result = await this.signInSocialUseCase.execute({
      provider: dto.provider,
      callbackURL: dto.callbackURL,
      context,
    });
    applyCookies(reply, result.cookies);
    this.issueCsrfCookie(reply);
    return result.data;
  }

  @ApiResponses(AUTH_RESPONSES.linkSocial)
  @ResponseMessage('auth.messages.redirect')
  @UseGuards(AuthGuard)
  @Post('/link-social')
  async linkSocial(
    @Body() dto: LinkSocialDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<any> {
    const context = this.requireContext();
    this.validateCallbackURL(dto.callbackURL);
    const result = await this.linkSocialUseCase.execute({
      provider: dto.provider,
      callbackURL: dto.callbackURL,
      context,
    });
    applyCookies(reply, result.cookies);
    this.issueCsrfCookie(reply);
    return result.data;
  }

  @ApiResponses(AUTH_RESPONSES.listLinkedAccounts)
  @ResponseMessage('auth.messages.list_linked_accounts_success')
  @UseGuards(AuthGuard)
  @Get('/list-accounts')
  async listLinkedAccounts(): Promise<any> {
    const context = this.requireContext();
    const result = await this.listLinkedAccountsUseCase.execute(context);
    return result.data;
  }

  @ApiResponses(AUTH_RESPONSES.unlinkAccount)
  @ResponseMessage('auth.messages.unlink_account_success')
  @UseGuards(AuthGuard)
  @Post('/unlink-account')
  async unlinkAccount(@Body() dto: UnlinkAccountDto): Promise<void> {
    const context = this.requireContext();
    await this.unlinkAccountUseCase.execute({
      providerId: dto.providerId,
      context,
    });
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.me)
  @ResponseMessage('auth.messages.session_success')
  @Get('/me')
  async getSession() {
    return this.getSessionUseCase.execute();
  }

  @ApiExcludeEndpoint()
  @Get('/callback/*')
  async handleOAuthCallback(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) res: FastifyReply,
  ) {
    await this.authProvider.handleRequest(req, res);
  }

  @ApiExcludeEndpoint()
  @Get('/error')
  async handleOAuthError(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) res: FastifyReply,
  ) {
    await this.authProvider.handleRequest(req, res);
  }
}
