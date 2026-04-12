# ARCHITECTURE

This document describes the architectural boundaries and cross-feature integration patterns used in this project. It distinguishes between rules that are **technically enforced** (via ESLint/TypeScript) and rules that are **conventions** (enforced via code review).

## 1) Project structure (Feature-first + Clean Architecture)

Each feature owns its internal layers:

- `modules/<feature>/domain` - pure domain (no NestJS/ORM/decorators)
- `modules/<feature>/application` - use-cases + ports
- `modules/<feature>/presentation` - controllers + DTOs + validation
- `modules/<feature>/infrastructure` - adapters (ORM/external providers)

Cross-cutting concerns live in `core/` (config, http pipeline, logging, i18n, shared infra wrappers).

## 2) Dependency direction rules

### Enforced via ESLint (CI will fail):

- `domain` CANNOT import from `application`, `presentation`, or `infrastructure`
- `domain` CANNOT import NestJS decorators, Prisma types, or class-validator
- `application` CANNOT import from `presentation` or `infrastructure`
- `application` CANNOT import Prisma types or class-validator
- No code outside `infrastructure` can import `@prisma/client` or generated Prisma types

### Convention (enforced via code review):

- `presentation -> application -> domain` is the preferred dependency flow
- `infrastructure -> application/domain` (implements ports/contracts)
- Avoid importing another feature's internal files directly when a module-level import suffices

### Not currently enforced:

- Cross-feature internal imports (e.g., `#src/modules/rbac/presentation/http/guards/...` from the users module) are NOT blocked by ESLint. This is a known gap — modules currently import each other's internal paths directly for guards, decorators, ports, and services. See Section 3 for the full dependency map.

## 3) Cross-feature integration pattern

Modules integrate with each other through NestJS module imports combined with injection tokens and direct imports:

- Feature B exports its services/ports via its NestJS module
- Feature A imports Feature B's module and injects the exported providers via tokens
- Cross-feature dependencies are wired through `useFactory` + `inject` in module providers
- Guards, decorators, and DTOs are imported directly from other modules' internal paths

### Current cross-feature dependencies

| Consumer | Provider | What is consumed | Import style |
|----------|----------|-----------------|-------------|
| Auth | Users | UserRepositoryPort | Token injection via domain port |
| Auth | RBAC | EffectivePermissionsService | Token injection via application service |
| Auth | Notify | EmailProviderPort | Token injection via domain port |
| Auth | RBAC | RbacGuard, Roles decorator | Direct presentation import |
| Auth | Users | UserResponseDto | Direct presentation import |
| Users | Auth | AuthProviderPort, AuthGuard | Token injection + direct presentation import |
| Users | RBAC | RoleRepositoryPort, GrantsRepositoryPort, EffectivePermissionsService | Token injection via domain ports + application service |
| Users | RBAC | RbacGuard, Roles, Permissions decorators, RoleResponseDto | Direct presentation import |
| Files | Auth | AuthGuard | Direct presentation import |
| Files | RBAC | RbacGuard, Permissions decorator | Direct presentation import |
| Core | Auth, RBAC | AuthCacheKeys, rbacCacheKeys | Direct application import (cache key aggregation) |

### Decision tree

Does Feature A need something from Feature B?

- Yes, synchronous and required for the request result
  - Feature A imports Feature B's NestJS module and injects exported providers via tokens
- Yes, but not required for the request result (async / eventual)
  - Use a domain event or job queue (e.g., BullMQ for email notifications)
- No
  - Do nothing (no coupling)

### Future improvement: shared contracts and public API boundaries

For stricter boundary enforcement, the project could:

1. Create `shared/contracts/` with neutral cross-feature interfaces
2. Add `index.ts` public API files to all modules (currently only `auth` and `files` have them)
3. Add an ESLint rule to block cross-feature internal imports and require imports via module index.ts

This is not yet implemented. The current approach (direct cross-feature imports) works but creates tighter coupling than ideal.

## 4) PR checklist (guidelines for review)

- Domain stays framework-free (no decorators, no ORM types) — **enforced by ESLint**
- Prisma types stay in infrastructure layer only — **enforced by ESLint**
- No direct `process.env` reads outside config/bootstrap — **convention**
- Only `#src/` path alias is allowed (no `@/`, `~/`, etc.) — **convention**
- Cross-feature dependencies should use module imports + token injection when possible — **convention**

## 5) Automated boundary enforcement

### 5.1 Import convention

- Within the same feature: use **relative imports only**

  ```ts
  // inside src/modules/auth/...
  import { LoginUseCase } from '../application/use-cases/login/login.use-case.js';
  ```

- Cross-feature: use **path aliases**
  ```ts
  import { AuthGuard } from '#src/modules/auth/presentation/http/auth.guard.js';
  ```

### 5.2 tsconfig setup (single alias)

Only `#src/` is the official alias. Do not add `@/`, `@src/`, `~/` or any other alias.

`#src/` uses `#` prefix (not `@`) to avoid collision with npm scoped packages (`@nestjs/...`, `@prisma/...`).

### 5.3 ESLint rules (what is actually enforced)

Configured in `eslint.config.mjs` (ESLint 9+ flat config format).

**Layer isolation rules (enforced):**

- **Domain layer**: Cannot import from NestJS, Prisma, class-validator, Redis, i18n, infrastructure, or application
- **Application layer**: Cannot import from Prisma, class-validator, Redis, i18n, infrastructure, or presentation
- **Presentation layer**: Cannot import Prisma or class-validator (except config/logger infrastructure)
- **Infrastructure layer**: Can import Prisma/Redis, cannot import presentation

**Not enforced by ESLint:**

- Cross-feature internal imports (e.g., importing from `#src/modules/rbac/presentation/...` inside the users module)
- These are currently allowed and used throughout the codebase

### 5.4 Runtime note (ESM/NodeNext)

The `paths` mapping in `tsconfig.json` is a TypeScript compile-time feature.
The project uses Node.js subpath imports (`"imports": { "#src/*": "./dist/src/*" }` in `package.json`) to resolve `#src/` at runtime.
