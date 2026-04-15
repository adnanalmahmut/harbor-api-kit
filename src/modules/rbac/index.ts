// Public API of the RBAC module.
// Cross-module consumers MUST import from this barrel only.
// Internal rbac-module code uses relative imports.
// NestJS module class is NOT re-exported — consuming .module.ts files
// import it directly from './rbac.module.js' to avoid circular barrel deps.

export * from './rbac.tokens.js';

// Domain ports — consumed by other modules via DI tokens
export type { GrantsRepositoryPort } from './domain/ports/grants.repository.port.js';
export type { RoleRepositoryPort } from './domain/ports/role.repository.port.js';
export type { PermissionRepositoryPort } from './domain/ports/permission.repository.port.js';

// Application services — public computation surface used cross-module
export { EffectivePermissionsService } from './application/services/effective-permissions.service.js';

// Cache key constants — consumed by core/infrastructure/redis
export { rbacCacheKeys } from './application/rbac.cache-keys.js';

// Presentation surface that other modules guard / decorate with
export { RbacGuard } from './presentation/http/guards/rbac.guard.js';
export { Roles } from './presentation/http/decorators/roles.decorator.js';
export { Permissions } from './presentation/http/decorators/permissions.decorator.js';

// Response DTOs — consumed cross-module for OpenAPI composition
export {
  RoleResponseDto,
  RoleWithPermissionsResponseDto,
  ListRolesResponseDto,
  PermissionResponseDto,
  ListPermissionsResponseDto,
  RolePermissionsResponseDto,
  PermissionKeyDto,
} from './presentation/http/dtos/rbac-response.dto.js';
