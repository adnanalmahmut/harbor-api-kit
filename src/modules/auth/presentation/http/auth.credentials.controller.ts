import { ApiResponses, RateLimit, ResponseMessage } from '#src/core/index.js';
import {
  GetSessionUseCase,
  LoginUserUseCase,
  RegisterUserUseCase,
  SignOutUseCase,
} from '../../application/index.js';
import { AUTH_TOKENS } from '../../auth.tokens.js';
import type { AuthProviderPort } from '../../domain/index.js';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from './auth.guard.js';
import { applyCookies, AUTH_RESPONSES } from './auth.http.js';
import { AuthHttpSupport } from './auth.http.support.js';
import { LoginDto, RegisterDto } from './dtos/index.js';

@Controller('auth')
export class AuthCredentialsController {
  constructor(
    private readonly support: AuthHttpSupport,
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUserUseCase,
    private readonly signOutUseCase: SignOutUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    @Inject(AUTH_TOKENS.AUTH_PROVIDER)
    private readonly authProvider: AuthProviderPort,
  ) {}

  @ApiResponses(AUTH_RESPONSES.register)
  @ResponseMessage('auth.messages.register_success')
  @Post('/register')
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const context = this.support.requireContext();
    const result = await this.registerUseCase.execute({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      context,
    });

    applyCookies(reply, result.cookies);
    this.support.issueCsrfCookie(reply);
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
    const context = this.support.requireContext();
    this.support.validateCallbackURL(body.callbackURL);
    const result = await this.loginUseCase.execute({
      email: body.email,
      password: body.password,
      rememberMe: body.rememberMe,
      redirect: body.redirect,
      callbackURL: body.callbackURL,
      context,
    });

    applyCookies(reply, result.cookies);
    this.support.issueCsrfCookie(reply);
    return result.data;
  }

  @UseGuards(AuthGuard)
  @ApiResponses(AUTH_RESPONSES.signOut)
  @ApiBody({ required: false, schema: { type: 'object', properties: {} } })
  @Post('/sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(@Res({ passthrough: true }) reply: FastifyReply) {
    const context = this.support.requireContext();
    const result = await this.signOutUseCase.execute({ context });
    applyCookies(reply, result.cookies);
    return;
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
