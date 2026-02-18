import type { RequestContext } from '#src/core/domain/context/request-context.type.js';
import type {
  ChangeEmailCommand,
  ChangePasswordCommand,
  ForgetPasswordCommand,
  GetSessionCommand,
  LinkSocialCommand,
  ResetPasswordCommand,
  SignInCommand,
  SignInSocialCommand,
  SignOutCommand,
  SignUpCommand,
  UnlinkAccountCommand,
  VerifyEmailCommand,
} from '#src/modules/auth/domain/ports/auth-commands.js';
import type {
  GetSessionResult,
  LinkedAccount,
  Session,
  SignInResultData,
  SignUpResultData,
  TokenResult,
  User,
} from '#src/modules/auth/domain/ports/auth-dtos.js';
import type { AuthResult } from '#src/modules/auth/domain/ports/auth-result.js';

export interface AuthProviderPort {
  signUpEmail(cmd: SignUpCommand): Promise<AuthResult<SignUpResultData>>;

  signInEmail(cmd: SignInCommand): Promise<AuthResult<SignInResultData>>;

  signOut(cmd: SignOutCommand): Promise<AuthResult<void>>;

  getSession(cmd: GetSessionCommand): Promise<GetSessionResult>;

  verifyEmail(cmd: VerifyEmailCommand): Promise<AuthResult<void>>;

  forgetPassword(cmd: ForgetPasswordCommand): Promise<AuthResult<void>>;

  resetPassword(cmd: ResetPasswordCommand): Promise<AuthResult<void>>;

  changePassword(cmd: ChangePasswordCommand): Promise<AuthResult<void>>;

  changeEmail(cmd: ChangeEmailCommand): Promise<AuthResult<TokenResult>>;

  listSessions(context: RequestContext): Promise<AuthResult<Session[]>>;

  revokeSession(
    token: string,
    context: RequestContext,
  ): Promise<AuthResult<void>>;

  revokeSessions(
    tokens: string[],
    context: RequestContext,
  ): Promise<AuthResult<void>>;

  revokeOtherSessions(context: RequestContext): Promise<AuthResult<void>>;

  requestVerificationEmail(
    email: string,
    context: RequestContext,
  ): Promise<AuthResult<void>>;

  checkPassword(
    password: string,
    context: RequestContext,
  ): Promise<AuthResult<boolean>>;

  validateResetToken(token: string): Promise<AuthResult<boolean>>;

  updateUser(
    input: Partial<User>,
    context: RequestContext,
  ): Promise<AuthResult<User>>;

  deleteUser(context: RequestContext): Promise<AuthResult<void>>;

  // Expose underlying handler for social callbacks and other library-internal routes
  handleRequest(req: unknown, res: unknown): Promise<void>;

  reactivateUser(email: string): Promise<AuthResult<void>>;
  signInSocial(cmd: SignInSocialCommand): Promise<AuthResult<SignInResultData>>;

  linkSocial(cmd: LinkSocialCommand): Promise<AuthResult<SignInResultData>>;

  listLinkedAccounts(
    context: RequestContext,
  ): Promise<AuthResult<LinkedAccount[]>>;

  unlinkAccount(cmd: UnlinkAccountCommand): Promise<AuthResult<void>>;

  invalidateUserSessions(userId: string): Promise<void>;

  invalidateAllSessions(): Promise<void>;
}
