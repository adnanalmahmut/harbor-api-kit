import { AppConfigModule, PrismaModule } from '#src/core/index.js';
import { AuthAccountController } from './presentation/http/auth.account.controller.js';
import { AuthCredentialsController } from './presentation/http/auth.credentials.controller.js';
import { AuthHttpSupport } from './presentation/http/auth.http.support.js';
import { AuthPasswordController } from './presentation/http/auth.password.controller.js';
import { AuthSessionsController } from './presentation/http/auth.sessions.controller.js';
import { AuthSocialController } from './presentation/http/auth.social.controller.js';
import { NotifyModule } from '#src/modules/notify/notify.module.js';
import { RbacModule } from '#src/modules/rbac/rbac.module.js';
import { SharedModule } from '#src/modules/shared/shared.module.js';
import { UsersModule } from '#src/modules/users/users.module.js';
import { Module } from '@nestjs/common';

import { authBindings } from './auth.bindings.js';
import { authExports } from './auth.exports.js';
import { authUseCaseProviders } from './auth.use-cases.providers.js';

@Module({
  imports: [
    PrismaModule,
    AppConfigModule,
    RbacModule,
    NotifyModule,
    UsersModule,
    SharedModule,
  ],
  controllers: [
    AuthCredentialsController,
    AuthPasswordController,
    AuthAccountController,
    AuthSessionsController,
    AuthSocialController,
  ],
  providers: [AuthHttpSupport, ...authBindings, ...authUseCaseProviders],
  exports: authExports,
})
export class AuthModule {}
