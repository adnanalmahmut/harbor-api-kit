# Module boundaries

This document operationalizes the import rules from [ARCHITECTURE.md §4](../ARCHITECTURE.md#4-dependency-direction), [§5](../ARCHITECTURE.md#5-cross-module-integration), and [§6](../ARCHITECTURE.md#6-public-api-boundary). When in doubt, the architecture document wins.

---

## 1. The four allowed import shapes

Inside a feature module, code MAY import from exactly four sources:

| Source | Example | When |
|--------|---------|------|
| **Same module, relative** | `import { PermissionKeyVO } from '../value-objects/permission-key.vo.js';` | In-module references. The default. |
| **`#src/core/...`** | `import { PrismaService } from '#src/core/index.js';` | Anything from `core/`. |
| **`#src/modules/<other>/index.js`** | `import { AUTHORIZATION_TOKENS } from '#src/modules/authorization/index.js';` | Cross-module references. **Always via the barrel.** |
| **External package** | `import { Module } from '@nestjs/common';` | Subject to layer restrictions in `eslint.config.mjs`. |

Anything else is a violation.

---

## 2. Allowed / forbidden — quick reference

### ✅ Allowed

```ts
// In src/modules/authorization/application/use-cases/set-user-permission-override.use-case.ts
import { isPermissionKey } from '../../domain/permissions.catalog.js';   // relative, same module
import type { AuthorizationRepositoryPort } from '../../domain/ports/authorization.repository.port.js';
import { AuthorizationException } from '../exceptions/authorization.exception.js';
```

```ts
// In src/modules/files/files.module.ts
import { PrismaModule } from '#src/core/index.js';                       // from core
import { AuthModule } from '#src/modules/auth/auth.module.js';           // module class via direct file
import { PermissionsGuard } from '#src/modules/authorization/index.js';  // provider via barrel
```

### ❌ Forbidden in new code

```ts
// Deep import past the target module's barrel
import { AuthGuard } from '#src/modules/auth/presentation/http/auth.guard.js';

// Self-reference via #src instead of relative
// (inside src/modules/authorization/...)
import { PermissionKeyVO } from '#src/modules/authorization/domain/value-objects/permission-key.vo.js';

// Layer violation — application reaching into infrastructure
// (inside src/modules/authorization/application/...)
import { PrismaAuthorizationRepository } from '../infrastructure/persistence/prisma-authorization.repository.js';

// Layer violation — domain reaching into NestJS
// (inside src/modules/authorization/domain/...)
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
| `presentation/` | `@prisma/client`, generated Prisma types, `ioredis`, `redis`, `class-validator`, `class-transformer`, `infrastructure/` (except `core/infrastructure/logger/`); configuration comes from `#src/config/index.js` |
| `infrastructure/` | `presentation/`, `class-validator`, `class-transformer` |
| **All of `src/`** | `class-validator`, `class-transformer`. `@prisma/client` and generated Prisma types outside `infrastructure/` and `core/db/prisma/`. |

---

## 4. Cross-module rule (convention, reviewer-enforced)

> **Cross-module imports MUST go through the target module's root `index.ts`.**

In code:

```ts
// ✅ Correct
import { AUTHORIZATION_TOKENS } from '#src/modules/authorization/index.js';

// ❌ Forbidden in new code
import { AUTHORIZATION_TOKENS } from '#src/modules/authorization/authorization.tokens.js';
import { GetUserPermissionsUseCase } from '#src/modules/authorization/application/use-cases/get-user-permissions.use-case.js';
```

When the symbol you need is not yet exported by the target barrel, the **only correct fix** is to extend that barrel:

```ts
// src/modules/authorization/index.ts
export * from './authorization.tokens.js';
export type { AuthorizationRepositoryPort } from './domain/ports/authorization.repository.port.js';   // ← add it here
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

NestJS modules occasionally need bidirectional references (e.g., `auth` ↔ `authorization`). Rules:

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
| Reference `PrismaService` / `RedisService` | `import { ... } from '#src/core/index.js';` |
| Reference runtime configuration | Import its factory from `#src/config/index.js`, then inject `<factory>.KEY` with `ConfigType<typeof factory>`. |
| Add a new env var | Declare it in the relevant Zod schema under `src/config/` and expose it from that namespace. Never read `process.env` in a consumer. |
| Throw a domain/application error | Subclass `AppException` in `<feature>/<layer>/exceptions/`. Never throw raw `Error` or framework errors at the application boundary. |
