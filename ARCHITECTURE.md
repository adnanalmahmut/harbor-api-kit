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

## 3) Cross-feature integration decision tree

Does Feature A need something from Feature B?

- Yes, synchronous and required for the request result
  - Use `shared/contracts/` + adapter in B (provider) + A consumes via token
- Yes, but not required for the request result (async / eventual)
  - Use a domain event published by B; A handles it in an event handler
- No
  - Do nothing (no coupling)

## 4) `shared/contracts/` rule (strict)

`shared/contracts/` is ONLY for cross-feature contracts where:

1. There is a clear consumer feature (A) and provider feature (B)
2. The call is synchronous and required for request correctness
3. The contract is a minimal integration surface (not internal models)
4. There is no simpler option inside a single feature boundary

Anything that does not cross feature boundaries MUST NOT go to `shared/contracts/`.

## 5) Reference implementation: Auth <-> Users

### 5.1 Contract (neutral)

Path:

- `src/shared/contracts/user-identity.contract.ts`

Contains:

- `USER_IDENTITY_CONTRACT` token
- `UserIdentityContract` interface
- Minimal types for inputs/outputs (plain types, no decorators)

### 5.2 Provider (Users)

Path:

- `src/modules/users/infrastructure/adapters/users-auth.adapter.ts`

Responsibilities:

- Implements `UserIdentityContract`
- Uses Users persistence internally (Prisma/TypeORM/etc.)
- No Auth imports (except the shared contract)

Users wiring:

- `src/modules/users/users.module.ts`
  - Binds `USER_IDENTITY_CONTRACT` to `UsersAuthAdapter`
  - Exports `USER_IDENTITY_CONTRACT` only (not the adapter class)

### 5.3 Consumer (Auth)

Path:

- `src/modules/auth/application/use-cases/login/*`

Responsibilities:

- Injects `USER_IDENTITY_CONTRACT` and calls it
- Does not import Users internals (no repositories, no Prisma)

Auth wiring:

- `src/modules/auth/auth.module.ts`
  - Imports `UsersModule`
  - Registers Auth use-cases

## 6) PR checklist (enforced in review)

- No feature imports another feature’s internals
- Any new cross-feature call follows the decision tree
- Any new `shared/contracts/` addition meets all 4 conditions
- Domain stays framework-free (no decorators, no ORM types)
- Any new alias is rejected (only `#src/` is allowed)

## 7) Optional: automated boundary enforcement

This section is self-contained: convention + ESLint + tsconfig + rationale.

### 7.1 Import convention (required for enforcement to work correctly)

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

### 7.2 tsconfig setup (single alias)

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

### 7.3 ESLint rule (enforces section 2)

Add to `.eslintrc`:

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

### 7.4 Runtime note (ESM/NodeNext)

The `paths` mapping in `tsconfig.json` is a TypeScript compile-time feature.
If the project runs in ESM/NodeNext, ensure the runtime/bundler also resolves `#src/*`.
Examples:

- Use Nest build output that rewrites/handles paths, or
- Configure the runtime resolver (e.g., tsconfig-paths for ts-node/tsx), or
- Use a bundler/resolver that supports TS path aliases.

Do not assume `tsconfig` paths alone will work at runtime.
