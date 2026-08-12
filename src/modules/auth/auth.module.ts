import { AuthorizationModule } from '#src/modules/authorization/authorization.module.js';
import { NotifyModule } from '#src/modules/notify/notify.module.js';
import { SharedModule } from '#src/modules/shared/shared.module.js';
import { forwardRef, Module } from '@nestjs/common';
import { authBindings } from './auth.bindings.js';
import { authExports } from './auth.exports.js';
import { BetterAuthRouteRegistrar } from './presentation/http/better-auth-route.registrar.js';

@Module({
  // Cycle: authorization's own controller needs AuthGuard from this module.
  imports: [forwardRef(() => AuthorizationModule), NotifyModule, SharedModule],
  providers: [BetterAuthRouteRegistrar, ...authBindings],
  exports: authExports,
})
export class AuthModule {}
