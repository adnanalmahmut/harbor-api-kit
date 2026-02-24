import {
  AppConfigModule,
  CORE_TOKENS,
  PrismaModule,
  RequestContextStoreAdapter,
} from '#src/core/index.js';
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
} from '#src/modules/auth/application/index.js';
import { AUTH_TOKENS } from '#src/modules/auth/auth.tokens.js';
import type {
  AuthEmailSenderPort,
  AuthProviderPort,
  CurrentSessionProviderPort,
} from '#src/modules/auth/domain/index.js';
import {
  AuthConfigAdapter,
  AuthEmailHooks,
  BetterAuthProvider,
  InfraCurrentSessionProvider,
  RedisSessionTrackerAdapter,
} from '#src/modules/auth/infrastructure/index.js';
import {
  AuthController,
  AuthGuard,
} from '#src/modules/auth/presentation/index.js';
import { NotifyModule } from '#src/modules/notify/notify.module.js';
import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import type { RoleRepositoryPort } from '#src/modules/rbac/domain/ports/role.repository.port.js';
import { RbacModule } from '#src/modules/rbac/rbac.module.js';
import { RBAC_TOKENS } from '#src/modules/rbac/rbac.tokens.js';
import { SharedModule } from '#src/modules/shared/shared.module.js';
import type { UserRepositoryPort } from '#src/modules/users/domain/ports/user.repository.port.js';
import { UsersModule } from '#src/modules/users/users.module.js';
import { USERS_TOKENS } from '#src/modules/users/users.tokens.js';
import { Module } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Module({
  imports: [
    PrismaModule,
    AppConfigModule,
    RbacModule,
    NotifyModule,
    UsersModule,
    SharedModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthGuard,
    AuthEmailHooks,
    { provide: AUTH_TOKENS.AUTH_PROVIDER, useClass: BetterAuthProvider },
    { provide: AUTH_TOKENS.AUTH_EMAIL_SENDER, useExisting: AuthEmailHooks },
    {
      provide: AUTH_TOKENS.CURRENT_SESSION_PROVIDER,
      useClass: InfraCurrentSessionProvider,
    },
    {
      provide: CORE_TOKENS.REQUEST_CONTEXT_STORE,
      useClass: RequestContextStoreAdapter,
    },
    {
      provide: AUTH_TOKENS.AUTH_CONFIG,
      useClass: AuthConfigAdapter,
    },
    {
      provide: AUTH_TOKENS.SESSION_TRACKER,
      useClass: RedisSessionTrackerAdapter,
    },
    {
      provide: RegisterUserUseCase,
      useFactory: (
        authProvider: AuthProviderPort,
        roleRepo: RoleRepositoryPort,
        effectivePermissions: EffectivePermissionsService,
        logger: Logger,
      ) => {
        return new RegisterUserUseCase(
          authProvider,
          roleRepo,
          effectivePermissions,
          logger,
        );
      },
      inject: [
        AUTH_TOKENS.AUTH_PROVIDER,
        RBAC_TOKENS.ROLE_REPOSITORY,
        EffectivePermissionsService,
        Logger,
      ],
    },
    {
      provide: LoginUserUseCase,
      useFactory: (
        authProvider: AuthProviderPort,
        roleRepo: RoleRepositoryPort,
        effectivePermissions: EffectivePermissionsService,
      ) => {
        return new LoginUserUseCase(
          authProvider,
          roleRepo,
          effectivePermissions,
        );
      },
      inject: [
        AUTH_TOKENS.AUTH_PROVIDER,
        RBAC_TOKENS.ROLE_REPOSITORY,
        EffectivePermissionsService,
      ],
    },
    {
      provide: VerifyEmailUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new VerifyEmailUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: ForgetPasswordUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new ForgetPasswordUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: ResetPasswordUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new ResetPasswordUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: ChangePasswordUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new ChangePasswordUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: ChangeEmailUseCase,
      useFactory: (
        authProvider: AuthProviderPort,
        authEmailSender: AuthEmailSenderPort,
        userRepo: UserRepositoryPort,
      ) => {
        return new ChangeEmailUseCase(authProvider, authEmailSender, userRepo);
      },
      inject: [
        AUTH_TOKENS.AUTH_PROVIDER,
        AUTH_TOKENS.AUTH_EMAIL_SENDER,
        USERS_TOKENS.USER_REPOSITORY,
      ],
    },
    {
      provide: GetSessionUseCase,
      useFactory: (
        effectivePermissions: EffectivePermissionsService,
        roleRepo: RoleRepositoryPort,
        authProvider: AuthProviderPort,
        currentSession: CurrentSessionProviderPort,
      ) => {
        return new GetSessionUseCase(
          effectivePermissions,
          roleRepo,
          authProvider,
          currentSession,
        );
      },
      inject: [
        EffectivePermissionsService,
        RBAC_TOKENS.ROLE_REPOSITORY,
        AUTH_TOKENS.AUTH_PROVIDER,
        AUTH_TOKENS.CURRENT_SESSION_PROVIDER,
      ],
    },
    {
      provide: SignOutUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new SignOutUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: ListSessionsUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new ListSessionsUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: RevokeSessionUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new RevokeSessionUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: RevokeSessionsUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new RevokeSessionsUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: RevokeOtherSessionsUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new RevokeOtherSessionsUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: SendVerificationEmailUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new SendVerificationEmailUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: VerifyPasswordUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new VerifyPasswordUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: CheckResetTokenUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new CheckResetTokenUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: UpdateUserUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new UpdateUserUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: DeleteUserUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new DeleteUserUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: ReactivateUserUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new ReactivateUserUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: SignInSocialUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new SignInSocialUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: LinkSocialUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new LinkSocialUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: ListLinkedAccountsUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new ListLinkedAccountsUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
    {
      provide: UnlinkAccountUseCase,
      useFactory: (authProvider: AuthProviderPort) => {
        return new UnlinkAccountUseCase(authProvider);
      },
      inject: [AUTH_TOKENS.AUTH_PROVIDER],
    },
  ],
  exports: [
    AuthGuard,
    AUTH_TOKENS.AUTH_PROVIDER,
    CORE_TOKENS.REQUEST_CONTEXT_STORE,
    AUTH_TOKENS.AUTH_CONFIG,
    AUTH_TOKENS.SESSION_TRACKER,
    RegisterUserUseCase,
    LoginUserUseCase,
    GetSessionUseCase,
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
  ],
})
export class AuthModule {}
