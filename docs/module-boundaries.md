# Module boundaries

This document operationalizes the import rules from [ARCHITECTURE.md §4](../ARCHITECTURE.md#4-dependency-direction), [§5](../ARCHITECTURE.md#5-cross-module-integration), and [§6](../ARCHITECTURE.md#6-public-api-boundary). When in doubt, the architecture document wins.

---

## 1. The four allowed import shapes

Inside a feature module, code MAY import from exactly four sources:

| Source | Example | When |
|--------|---------|------|
| **Same module, relative** | `import { User } from '../entities/user.entity.js';` | In-module references. The default. |
| **`#src/core/...`** | `import { PrismaService } from '#src/core/index.js';` | Anything from `core/`. |
| **`#src/modules/<other>/index.js`** | `import { USERS_TOKENS } from '#src/modules/users/index.js';` | Cross-module references. **Always via the barrel.** |
| **External package** | `import { Module } from '@nestjs/common';` | Subject to layer restrictions in `eslint.config.mjs`. |

Anything else is a violation.

---

## 2. Allowed / forbidden — quick reference

### ✅ Allowed

```ts
// In src/modules/users/application/use-cases/create-user.use-case.ts
import { User } from '../../domain/entities/user.entity.js';            // relative, same module
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port.js';
import { UsersException } from '../exceptions/users.exception.js';
```

```ts
// In src/modules/users/users.module.ts
import { PrismaModule } from '#src/core/index.js';                       // from core
import { AUTH_TOKENS, AuthModule } from '#src/modules/auth/index.js';    // from another module via barrel
```

### ❌ Forbidden in new code

```ts
// Deep import past the target module's barrel
import { AuthGuard } from '#src/modules/auth/presentation/http/auth.guard.js';

// Self-reference via #src instead of relative
// (inside src/modules/users/...)
import { User } from '#src/modules/users/domain/entities/user.entity.js';

// Layer violation — application reaching into infrastructure
// (inside src/modules/users/application/...)
import { PrismaUserRepository } from '../infrastructure/persistence/prisma-user.repository.js';

// Layer violation — domain reaching into NestJS
// (inside src/modules/users/domain/...)
import { Injectable } from '@nestjs/common';

// Forbidden globally
import { IsEmail } from 'class-validator';
```

---

## 3. Layer rules (ESLint-enforced)

These are mechanically enforced in [eslint.config.mjs](../eslint.config.mjs). A violation fails CI.

| Layer | Forbidden imports |
|-------|-------------------|
| `domain/` | `@nestjs/*`, `@prisma/client`, generated Prisma types, `ioredis`, `redis`, `nestjs-i18n`, `class-validator`, `class-transformer`, `application/`, `infrastructure/`, `presentation/`, request context internals |
| `application/` | `@prisma/client`, generated Prisma types, `@nestjs/*`, `ioredis`, `redis`, `nestjs-i18n`, `class-validator`, `class-transformer`, `infrastructure/`, `presentation/`, request context internals |
| `presentation/` | `@prisma/client`, generated Prisma types, `ioredis`, `redis`, `class-validator`, `class-transformer`, `infrastructure/` (except `core/infrastructure/config/` and `core/infrastructure/logger/`) |
| `infrastructure/` | `presentation/`, `class-validator`, `class-transformer` |
| **All of `src/`** | `class-validator`, `class-transformer`. `@prisma/client` and generated Prisma types outside `infrastructure/` and `core/db/prisma/`. |

---

## 4. Cross-module rule (convention, reviewer-enforced)

> **Cross-module imports MUST go through the target module's root `index.ts`.**

In code:

```ts
// ✅ Correct
import { USERS_TOKENS, UsersModule } from '#src/modules/users/index.js';

// ❌ Forbidden in new code
import { USERS_TOKENS } from '#src/modules/users/users.tokens.js';
import { CreateUserUseCase } from '#src/modules/users/application/use-cases/create-user.use-case.js';
```

When the symbol you need is not yet exported by the target barrel, the **only correct fix** is to extend that barrel:

```ts
// src/modules/users/index.ts
export * from './users.module.js';
export * from './users.tokens.js';
export * from './domain/ports/user.repository.port.js';   // ← add it here
```

Do **not** deep-import as a workaround.

### ESLint enforcement is planned

Currently this rule is reviewer-enforced. A future `no-restricted-imports` pattern will make it mechanical. Until then, every PR review MUST check for new deep cross-module imports.

### Legacy deep imports

The cross-module dependency map in [ARCHITECTURE.md §5.1](../ARCHITECTURE.md#51-current-cross-module-dependency-map-migration-target) lists existing deep imports. They are **not** a precedent for new code; they are a migration backlog.

---

## 5. The Prisma boundary

Prisma is the most easily-leaked dependency. Rules:

- `@prisma/client` and `#src/generated/prisma/**` MAY only be imported from:
  - `src/modules/<feature>/infrastructure/**`
  - `src/core/db/prisma/**` (where `PrismaService` is defined)
- Exposing a Prisma type in a port signature, an application function signature, or a DTO is a violation. Define your own domain type and translate at the infrastructure boundary via a mapper (`infrastructure/mappers/`).

---

## 6. Circular dependencies

NestJS modules occasionally need bidirectional references (e.g., `users` ↔ `auth`). Rules:

- Use `forwardRef(() => OtherModule)` in the `imports` array.
- Document the cycle either in [ARCHITECTURE.md §5.1](../ARCHITECTURE.md#51-current-cross-module-dependency-map-migration-target) or with a one-line comment at the import site explaining why the cycle is unavoidable.
- A new circular dependency between two modules MUST be justified in the PR description. Prefer redesigning the feature to avoid it.

---

## 7. Imports inside `core/`

Within `core/`, the same layer rules apply:

- `core/domain/` MUST NOT import NestJS, Prisma, Redis, i18n, or other `core/` layers above it.
- `core/application/` MUST NOT import infrastructure or presentation.
- `core/infrastructure/` MAY use Prisma and Redis (this is where they are wired).
- `core/presentation/` MUST NOT import non-config/non-logger infrastructure.

`core/` MUST NOT import from any feature module. If it does, that's a sign the code belongs in a feature, not in core. See [shared-core-extraction.md](shared-core-extraction.md).

---

## 8. Quick decision table

| You need to … | Do this |
|---------------|---------|
| Reference an entity in the same module | Relative import. |
| Reference Prisma | Only from `infrastructure/`. |
| Reference another feature's port | Import the port from `#src/modules/<other>/index.js`. If not exported there, extend that barrel first. |
| Reference another feature's guard / decorator / response DTO | Same: through the barrel. Extend it if needed. |
| Reference `PrismaService` / `RedisService` / `AppConfigService` | `import { ... } from '#src/core/index.js';` |
| Add a new env var | Declare in `core/infrastructure/config/env.schema.ts`, read via `AppConfigService`. Never `process.env`. |
| Throw a domain/application error | Subclass `AppException` in `<feature>/<layer>/exceptions/`. Never throw raw `Error` or framework errors at the application boundary. |
