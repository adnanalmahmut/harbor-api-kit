import type { RequestContext } from '#src/core/context/request-context.type.js';

export type SignUpCommand = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  locale?: string;
  context: RequestContext;
};

export type SignInCommand = {
  email: string;
  password: string;
  rememberMe?: boolean;
  redirect?: boolean;
  callbackURL?: string;
  context: RequestContext;
};

export type SignOutCommand = {
  context: RequestContext;
};

export type ForgetPasswordCommand = {
  email: string;
  redirectTo?: string;
  context: RequestContext;
};

export type ResetPasswordCommand = {
  token: string;
  newPassword: string;
  context: RequestContext;
};

export type ChangePasswordCommand = {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
  context: RequestContext;
};

export type ChangeEmailCommand = {
  newEmail: string;
  callbackURL?: string;
  context: RequestContext;
};

export type VerifyEmailCommand = {
  token: string;
  context: RequestContext;
};

export type GetSessionCommand = {
  context: RequestContext;
};

export type SignInSocialCommand = {
  provider: 'google' | 'github';
  callbackURL?: string;
  context: RequestContext;
};

export type LinkSocialCommand = {
  provider: 'google' | 'github';
  callbackURL?: string;
  context: RequestContext;
};

export type UnlinkAccountCommand = {
  providerId: 'google' | 'github'; // BetterAuth usually identifies by provider name
  context: RequestContext;
};
