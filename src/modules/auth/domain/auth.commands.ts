import type { RequestContext } from '#src/core/index.js';

export const AUTH_PROVIDERS = ['google', 'github'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export type SignUpCommand = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
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
  provider: AuthProvider;
  callbackURL?: string;
  context: RequestContext;
};

export type LinkSocialCommand = {
  provider: AuthProvider;
  callbackURL?: string;
  context: RequestContext;
};

export type UnlinkAccountCommand = {
  providerId: AuthProvider;
  context: RequestContext;
};
