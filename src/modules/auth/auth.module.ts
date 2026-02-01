import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { PrismaModule } from '#src/infrastructure/db/prisma/prisma.module.js';
import { NestLoggerAdapter } from '#src/infrastructure/logging/nest-logger.adapter.js';
import type { AuthEmailSenderPort } from '#src/modules/auth/application/ports/auth-email.sender.port.js';
import type { AuthProviderPort } from '#src/modules/auth/application/ports/auth-provider.port.js';
import type { CurrentSessionProviderPort } from '#src/modules/auth/application/ports/current-session.provider.port.js';
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
import { RequestContextStoreAdapter } from '#src/modules/auth/infrastructure/adapters/request-context.store.adapter.js';
import { BetterAuthProvider } from '#src/modules/auth/infrastructure/better-auth/better-auth.provider.adapter.js';
import { AuthEmailHooks } from '#src/modules/auth/infrastructure/better-auth/hooks/auth-email.hooks.js';
import { InfraCurrentSessionProvider } from '#src/modules/auth/infrastructure/context/infra-current-session.provider.js';
import { AuthController } from '#src/modules/auth/presentation/http/auth.controller.js';
import { AuthGuard } from '#src/modules/auth/presentation/http/guards/auth.guard.js';
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
      provide: AUTH_TOKENS.REQUEST_CONTEXT_STORE,
      useClass: RequestContextStoreAdapter,
    },
    {
      provide: RegisterUserUseCase,
      useFactory: (
        authProvider: AuthProviderPort,
        roleRepo: RoleRepositoryPort,
        effectivePermissions: EffectivePermissionsService,
      ) => {
        return new RegisterUserUseCase(
          authProvider,
          roleRepo,
          effectivePermissions,
          new NestLoggerAdapter(RegisterUserUseCase.name),
        );
      },
      inject: [
        AUTH_TOKENS.AUTH_PROVIDER,
        RBAC_TOKENS.ROLE_REPOSITORY,
        EffectivePermissionsService,
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
    AUTH_TOKENS.REQUEST_CONTEXT_STORE,
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
