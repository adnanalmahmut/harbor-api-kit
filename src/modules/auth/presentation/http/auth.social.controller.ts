import { ApiResponses, ResponseMessage } from '#src/core/index.js';
import {
  LinkSocialUseCase,
  ListLinkedAccountsUseCase,
  SignInSocialUseCase,
  UnlinkAccountUseCase,
} from '../../application/index.js';
import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthGuard } from './auth.guard.js';
import { applyCookies, AUTH_RESPONSES } from './auth.http.js';
import { AuthHttpSupport } from './auth.http.support.js';
import {
  LinkSocialDto,
  SignInSocialDto,
  UnlinkAccountDto,
} from './dtos/index.js';

@Controller('auth')
export class AuthSocialController {
  constructor(
    private readonly support: AuthHttpSupport,
    private readonly signInSocialUseCase: SignInSocialUseCase,
    private readonly linkSocialUseCase: LinkSocialUseCase,
    private readonly listLinkedAccountsUseCase: ListLinkedAccountsUseCase,
    private readonly unlinkAccountUseCase: UnlinkAccountUseCase,
  ) {}

  @ApiResponses(AUTH_RESPONSES.socialSignIn)
  @ResponseMessage('auth.messages.redirect')
  @Post('/sign-in/social')
  async signInSocial(
    @Body() dto: SignInSocialDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<any> {
    const context = this.support.requireContext();
    this.support.validateCallbackURL(dto.callbackURL);
    const result = await this.signInSocialUseCase.execute({
      provider: dto.provider,
      callbackURL: dto.callbackURL,
      context,
    });
    applyCookies(reply, result.cookies);
    this.support.issueCsrfCookie(reply);
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
    const context = this.support.requireContext();
    this.support.validateCallbackURL(dto.callbackURL);
    const result = await this.linkSocialUseCase.execute({
      provider: dto.provider,
      callbackURL: dto.callbackURL,
      context,
    });
    applyCookies(reply, result.cookies);
    this.support.issueCsrfCookie(reply);
    return result.data;
  }

  @ApiResponses(AUTH_RESPONSES.listLinkedAccounts)
  @ResponseMessage('auth.messages.list_linked_accounts_success')
  @UseGuards(AuthGuard)
  @Get('/list-accounts')
  async listLinkedAccounts(): Promise<any> {
    const context = this.support.requireContext();
    const result = await this.listLinkedAccountsUseCase.execute(context);
    return result.data;
  }

  @ApiResponses(AUTH_RESPONSES.unlinkAccount)
  @ResponseMessage('auth.messages.unlink_account_success')
  @UseGuards(AuthGuard)
  @Post('/unlink-account')
  async unlinkAccount(@Body() dto: UnlinkAccountDto): Promise<void> {
    const context = this.support.requireContext();
    await this.unlinkAccountUseCase.execute({
      providerId: dto.providerId,
      context,
    });
  }
}
