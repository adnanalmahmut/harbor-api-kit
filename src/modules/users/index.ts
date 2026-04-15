// Public API of the Users module.
// Cross-module consumers MUST import from this barrel only.
// Internal users-module code uses relative imports.
// NestJS module class is NOT re-exported — consuming .module.ts files
// import it directly from './users.module.js' to avoid circular barrel deps.

export * from './users.tokens.js';

// Domain ports — consumed by other modules via DI tokens
export type { UserRepositoryPort } from './domain/ports/user.repository.port.js';

// Application use-cases — exported so other modules can depend on them via Nest DI
export { CreateUserUseCase } from './application/use-cases/create-user.use-case.js';
export { GetUserByIdUseCase } from './application/use-cases/get-users.use-case.js';
export { UpdateUserByIdUseCase } from './application/use-cases/update-user-by-id.use-case.js';

// Response DTOs — consumed cross-module for OpenAPI composition
export {
  UserResponseDto,
  ListUsersResponseDto,
  UserRolesResponseDto,
  UserPermissionsResponseDto,
  EffectivePermissionsResponseDto,
  PermissionOverrideResponseDto,
  PermissionKeyResponseDto,
} from './presentation/http/dtos/users-response.dto.js';
