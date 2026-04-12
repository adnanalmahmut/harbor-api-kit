# ARCHITECTURE

This document is the single source of truth for architectural boundaries and cross-feature integration rules.

## 1) Project structure (Feature-first + Clean Architecture)

Each feature owns its internal layers:

- `modules/<feature>/domain` - pure domain (no NestJS/ORM/decorators)
- `modules/<feature>/application` - use-cases + ports (or contracts via shared)
- `modules/<feature>/presentation` - controllers + DTOs + validation
- `modules/<feature>/infrastructure` - adapters (ORM/external providers)

Cross-cutting concerns live in `core/` (config, http pipeline, logging, i18n, shared infra wrappers).

## 2) Dependency direction rules

Allowed:

- `presentation -> application -> domain`
- `infrastructure -> application/domain` (implements ports/contracts)
- `feature -> shared` (types/contracts only)

Forbidden:

- `domain` importing from `application/presentation/infrastructure`
- `application` importing from `presentation/infrastructure`
- Any `feature A` importing internal files of `feature B` (except via `shared/contracts` or `feature B` public API)

## 3) Cross-feature integration pattern

Modules integrate with each other through two mechanisms:

### NestJS Module imports + Injection tokens

The primary integration pattern uses NestJS module imports combined with injection tokens:

- Feature B exports its services/ports via its NestJS module
- Feature A imports Feature B's module and injects the exported providers via tokens
- Cross-feature dependencies are wired through `useFactory` + `inject` in module providers

Example: Auth module imports UsersModule and injects `UserRepositoryPort` via token.

### Port interfaces for cross-cutting services

Services needed by multiple features (e.g., `EffectivePermissionsService`, `AuthProviderPort`) are:

- Defined as interfaces/ports in the providing module's domain layer
- Implemented in the providing module's infrastructure layer
- Exported via the NestJS module system
- Injected by consuming modules via tokens

### Decision tree

Does Feature A need something from Feature B?

- Yes, synchronous and required for the request result
  - Feature A imports Feature B's NestJS module and injects exported providers via tokens
- Yes, but not required for the request result (async / eventual)
  - Use a domain event or job queue (e.g., BullMQ for email notifications)
- No
  - Do nothing (no coupling)

### Current cross-feature dependencies

| Consumer | Provider | What is consumed | Mechanism |
|----------|----------|-----------------|-----------|
| Auth | Users | UserRepositoryPort | Token injection |
| Auth | RBAC | EffectivePermissionsService | Token injection |
| Auth | Notify | EmailProviderPort | Token injection |
| Users | Auth | AuthProviderPort | Token injection (forwardRef) |
| Users | RBAC | RoleRepositoryPort, GrantsRepositoryPort, EffectivePermissionsService | Token injection |
| Files | Auth | AuthGuard | Guard import |
| Files | RBAC | RbacGuard, Permissions decorator | Guard/decorator import |

### Future improvement: shared contracts

For stricter boundary enforcement, cross-feature types can be moved to a `shared/contracts/` directory with neutral interfaces. This is not yet implemented but is the recommended direction for reducing coupling.

## 4) PR checklist (enforced in review)

- Cross-feature dependencies use NestJS module imports + token injection
- Avoid importing another feature’s internal files directly when possible
- Domain stays framework-free (no decorators, no ORM types)
- Prisma types stay in infrastructure layer only
- No direct `process.env` reads outside config/bootstrap
- Only `#src/` path alias is allowed (no `@/`, `~/`, etc.)

## 5) Automated boundary enforcement

This section is self-contained: convention + ESLint + tsconfig + rationale.

### 5.1 Import convention (required for enforcement to work correctly)

The ESLint rule below assumes a strict import convention to avoid false positives:

- Within the same feature: use **relative imports only**

  ```ts
  // ✅ inside src/modules/auth/...
  import { LoginUseCase } from '../application/use-cases/login/login.use-case';
  import { Session } from '../domain/entities/session.entity';
  ```

- Cross-feature or shared: use **path aliases only**
  ```ts
  // ✅ from anywhere
  import { USER_IDENTITY_CONTRACT } from '#src/shared/contracts/user-identity.contract';
  import { UsersModule } from '#src/modules/users/index';
  ```

Why this matters:

- If a developer uses a path alias inside the same feature, the rule may fail the build even though the import is intra-feature.
- Using relative imports inside a feature keeps the rule focused on cross-feature imports only.

### 5.2 tsconfig setup (single alias)

In `tsconfig.json`:

{
"compilerOptions": {
"paths": {
"#src/_": ["src/_"]
}
}
}

Only `#src/` is the official alias for this project.
Do not add `@/`, `@src/`, `~/` or any other alias.
Any PR introducing a new alias will be rejected in review.

Note: `#src/` uses `#` prefix (not `@`) to avoid collision with npm scoped
packages (`@nestjs/...`, `@prisma/...`). This prevents editor and bundler confusion.

### 5.3 ESLint rules (enforces section 2)

Configured in `eslint.config.mjs` (ESLint 9+ flat config format). Key rules:

{
"rules": {
"no-restricted-imports": ["error", {
"patterns": [
{
"group": [
"#src/modules/*/domain/**",
"#src/modules/*/application/**",
"#src/modules/*/infrastructure/**",
"#src/modules/*/presentation/**"
],
"message": "Cross-feature internal imports are forbidden. Use #src/shared/contracts or the feature public API (#src/modules/<feature>/index)."
}
]
}]
}
}

Allowed cross-feature imports:

- `#src/shared/contracts/**`
- `#src/modules/<feature>/index` (public API)

This converts social rules (PR review) into technical rules (CI failure).

### 5.4 Runtime note (ESM/NodeNext)

The `paths` mapping in `tsconfig.json` is a TypeScript compile-time feature.
If the project runs in ESM/NodeNext, ensure the runtime/bundler also resolves `#src/*`.
Examples:

- Use Nest build output that rewrites/handles paths, or
- Configure the runtime resolver (e.g., tsconfig-paths for ts-node/tsx), or
- Use a bundler/resolver that supports TS path aliases.

Do not assume `tsconfig` paths alone will work at runtime.
