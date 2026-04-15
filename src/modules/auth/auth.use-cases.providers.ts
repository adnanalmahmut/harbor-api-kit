import { AUTH_TOKENS } from './auth.tokens.js';
import { EffectivePermissionsService } from '#src/modules/rbac/index.js';
import { RBAC_TOKENS } from '#src/modules/rbac/index.js';
import { USERS_TOKENS } from '#src/modules/users/index.js';
import {
  type FactoryProvider,
  type InjectionToken,
  type Provider,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';

import {
  ChangeEmailUseCase,
  ChangePasswordUseCase,
  CheckResetTokenUseCase,
  DeleteUserUseCase,
  ForgetPasswordUseCase,
  GetSessionUseCase,
  LinkSocialUseCase,
  ListLinkedAccountsUseCase,
  ListSessionsUseCase,
  LoginUserUseCase,
  ReactivateUserUseCase,
  RegisterUserUseCase,
  ResetPasswordUseCase,
  RevokeOtherSessionsUseCase,
  RevokeSessionsUseCase,
  RevokeSessionUseCase,
  SendVerificationEmailUseCase,
  SignInSocialUseCase,
  SignOutUseCase,
  UnlinkAccountUseCase,
  UpdateUserUseCase,
  VerifyEmailUseCase,
  VerifyPasswordUseCase,
} from './application/index.js';

type Ctor<T> = new (...args: any[]) => T;

export function provideUseCase<T>(
  UseCase: Ctor<T>,
  inject: readonly InjectionToken[],
): FactoryProvider<T> {
  return {
    provide: UseCase,
    useFactory: (...deps: unknown[]) => new UseCase(...(deps as any[])),
    inject: inject as InjectionToken[],
  };
}

const AUTH_ONLY_USE_CASES = [
  VerifyEmailUseCase,
  ForgetPasswordUseCase,
  ResetPasswordUseCase,
  ChangePasswordUseCase,
  SignOutUseCase,
  ListSessionsUseCase,
  RevokeSessionUseCase,
  RevokeSessionsUseCase,
  RevokeOtherSessionsUseCase,
  SendVerificationEmailUseCase,
  VerifyPasswordUseCase,
  CheckResetTokenUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ReactivateUserUseCase,
  SignInSocialUseCase,
  LinkSocialUseCase,
  ListLinkedAccountsUseCase,
  UnlinkAccountUseCase,
].map((UseCase: unknown) =>
  provideUseCase(UseCase as Ctor<any>, [
    AUTH_TOKENS.AUTH_PROVIDER as InjectionToken,
  ]),
);

const COMPLEX_USE_CASES = [
  provideUseCase(RegisterUserUseCase, [
    AUTH_TOKENS.AUTH_PROVIDER as InjectionToken,
    RBAC_TOKENS.ROLE_REPOSITORY,
    EffectivePermissionsService,
    Logger,
  ]),
  provideUseCase(LoginUserUseCase, [
    AUTH_TOKENS.AUTH_PROVIDER as InjectionToken,
    RBAC_TOKENS.ROLE_REPOSITORY,
    EffectivePermissionsService,
  ]),
  provideUseCase(ChangeEmailUseCase, [
    AUTH_TOKENS.AUTH_PROVIDER as InjectionToken,
    AUTH_TOKENS.AUTH_EMAIL_SENDER as InjectionToken,
    USERS_TOKENS.USER_REPOSITORY,
  ]),
  provideUseCase(GetSessionUseCase, [
    EffectivePermissionsService,
    RBAC_TOKENS.ROLE_REPOSITORY,
    AUTH_TOKENS.AUTH_PROVIDER as InjectionToken,
    AUTH_TOKENS.CURRENT_SESSION_PROVIDER as InjectionToken,
  ]),
];

export const authUseCaseProviders: Provider[] = [
  ...AUTH_ONLY_USE_CASES,
  ...COMPLEX_USE_CASES,
];
