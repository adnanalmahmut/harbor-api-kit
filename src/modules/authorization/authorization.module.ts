import { AuthModule } from '#src/modules/auth/auth.module.js';
import { forwardRef, Module } from '@nestjs/common';
import { AuthorizationController } from './authorization.controller.js';
import { AuthorizationService } from './authorization.service.js';
import { EffectivePermissionsService } from './effective-permissions.service.js';
import { PermissionsGuard } from './permissions.guard.js';

// `AuthorizationRepository` is provided globally by PersistenceModule.
@Module({
  // Cycle: auth needs EffectivePermissionsService to guard the Better Auth
  // admin routes; authorization needs AuthGuard for its own controller.
  imports: [forwardRef(() => AuthModule)],
  controllers: [AuthorizationController],
  providers: [
    AuthorizationService,
    EffectivePermissionsService,
    PermissionsGuard,
  ],
  exports: [PermissionsGuard, EffectivePermissionsService],
})
export class AuthorizationModule {}
