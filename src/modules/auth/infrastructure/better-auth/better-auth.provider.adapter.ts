// Facade implementing AuthProviderPort. The class holds the DI
// lifecycle (constructor wiring, BetterAuth instance creation) and
// delegates each port method to one of five concern-scoped ops
// factories: credentials, session, password, account, social.
//
// Application code depends only on AuthProviderPort (domain). The ops
// files in this directory are infrastructure adapters — NOT use cases
// or application services. If an ops file grows materially beyond its
// current shape, prefer promoting it to an injectable class rather
// than expanding the factory bundle further.
import {
  AppConfigService,
  PrismaService,
  RedisService,
  type RequestContext,
} from '#src/core/index.js';
import type {
  AuthProviderPort,
  AuthResult,
  ChangeEmailCommand,
  ChangePasswordCommand,
  ForgetPasswordCommand,
  GetSessionCommand,
  GetSessionResult,
  LinkedAccount,
  LinkSocialCommand,
  ResetPasswordCommand,
  Session,
  SignInCommand,
  SignInResultData,
  SignInSocialCommand,
  SignOutCommand,
  SignUpCommand,
  SignUpResultData,
  TokenResult,
  UnlinkAccountCommand,
  User,
  VerifyEmailCommand,
} from '../../domain/index.js';
import { Injectable } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { PinoLogger } from 'nestjs-pino';
import { createBetterAuth, type BetterAuthInstance } from './auth.js';
import { createAccountOps } from './better-auth.account.ops.js';
import { createCredentialsOps } from './better-auth.credentials.ops.js';
import type { BetterAuthDeps } from './better-auth.deps.js';
import { createPasswordOps } from './better-auth.password.ops.js';
import {
  invalidateAllSessions,
  invalidateUserSessions,
} from './better-auth.session-cache.js';
import { createSessionOps } from './better-auth.session.ops.js';
import { createSocialOps } from './better-auth.social.ops.js';
import { AuthEmailHooks } from './hooks/auth-email.hooks.js';

@Injectable()
export class BetterAuthProvider implements AuthProviderPort {
  private readonly auth: BetterAuthInstance;
  private readonly credentials: ReturnType<typeof createCredentialsOps>;
  private readonly session: ReturnType<typeof createSessionOps>;
  private readonly password: ReturnType<typeof createPasswordOps>;
  private readonly account: ReturnType<typeof createAccountOps>;
  private readonly social: ReturnType<typeof createSocialOps>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly authEmailHooks: AuthEmailHooks,
    private readonly redisService: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BetterAuthProvider.name);
    this.auth = createBetterAuth(
      this.prisma,
      this.config,
      this.authEmailHooks,
      this.logger,
    );
    const nodeHandler = toNodeHandler(this.auth);

    const deps: BetterAuthDeps = {
      auth: this.auth,
      prisma: this.prisma,
      config: this.config,
      redisService: this.redisService,
      logger: this.logger,
    };

    this.credentials = createCredentialsOps(deps);
    this.session = createSessionOps(deps, nodeHandler);
    this.password = createPasswordOps(deps);
    this.account = createAccountOps(deps);
    this.social = createSocialOps(deps);
  }

  handleRequest(req: unknown, res: unknown): Promise<void> {
    return this.session.handleRequest(req, res);
  }

  signUpEmail(cmd: SignUpCommand): Promise<AuthResult<SignUpResultData>> {
    return this.credentials.signUpEmail(cmd);
  }

  signInEmail(cmd: SignInCommand): Promise<AuthResult<SignInResultData>> {
    return this.credentials.signInEmail(cmd);
  }

  signOut(cmd: SignOutCommand): Promise<AuthResult<void>> {
    return this.session.signOut(cmd);
  }

  getSession(cmd: GetSessionCommand): Promise<AuthResult<GetSessionResult>> {
    return this.session.getSession(cmd);
  }

  listSessions(context: RequestContext): Promise<AuthResult<Session[]>> {
    return this.session.listSessions(context);
  }

  revokeSession(
    sessionId: string,
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    return this.session.revokeSession(sessionId, context);
  }

  revokeSessions(
    sessionIds: string[],
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    return this.session.revokeSessions(sessionIds, context);
  }

  revokeOtherSessions(context: RequestContext): Promise<AuthResult<void>> {
    return this.session.revokeOtherSessions(context);
  }

  verifyEmail(cmd: VerifyEmailCommand): Promise<AuthResult<void>> {
    return this.account.verifyEmail(cmd);
  }

  forgetPassword(cmd: ForgetPasswordCommand): Promise<AuthResult<void>> {
    return this.password.forgetPassword(cmd);
  }

  resetPassword(cmd: ResetPasswordCommand): Promise<AuthResult<void>> {
    return this.password.resetPassword(cmd);
  }

  changePassword(cmd: ChangePasswordCommand): Promise<AuthResult<void>> {
    return this.password.changePassword(cmd);
  }

  changeEmail(cmd: ChangeEmailCommand): Promise<AuthResult<TokenResult>> {
    return this.account.changeEmail(cmd);
  }

  requestVerificationEmail(
    email: string,
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    return this.account.requestVerificationEmail(email, context);
  }

  checkPassword(
    password: string,
    context: RequestContext,
  ): Promise<AuthResult<boolean>> {
    return this.password.checkPassword(password, context);
  }

  validateResetToken(token: string): Promise<AuthResult<boolean>> {
    return this.password.validateResetToken(token);
  }

  updateUser(
    input: Partial<User>,
    context: RequestContext,
  ): Promise<AuthResult<User>> {
    return this.account.updateUser(input, context);
  }

  deleteUser(context: RequestContext): Promise<AuthResult<void>> {
    return this.account.deleteUser(context);
  }

  reactivateUser(email: string): Promise<AuthResult<void>> {
    return this.account.reactivateUser(email);
  }

  signInSocial(
    cmd: SignInSocialCommand,
  ): Promise<AuthResult<SignInResultData>> {
    return this.social.signInSocial(cmd);
  }

  linkSocial(cmd: LinkSocialCommand): Promise<AuthResult<SignInResultData>> {
    return this.social.linkSocial(cmd);
  }

  listLinkedAccounts(
    context: RequestContext,
  ): Promise<AuthResult<LinkedAccount[]>> {
    return this.social.listLinkedAccounts(context);
  }

  unlinkAccount(cmd: UnlinkAccountCommand): Promise<AuthResult<void>> {
    return this.social.unlinkAccount(cmd);
  }

  invalidateUserSessions(userId: string): Promise<void> {
    return invalidateUserSessions(userId, this.redisService, this.logger);
  }

  invalidateAllSessions(): Promise<void> {
    return invalidateAllSessions(this.redisService);
  }
}
