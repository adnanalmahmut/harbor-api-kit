import { AppConfigModule, PrismaModule } from '#src/core/index.js';
import { AuthController } from './presentation/http/auth.controller.js';
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
  controllers: [AuthController],
  providers: [...authBindings, ...authUseCaseProviders],
  exports: authExports,
})
export class AuthModule {}
