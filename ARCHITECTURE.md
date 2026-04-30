# ARCHITECTURE

This document is the **authoritative architectural reference** for `harbor-api-kit`. It defines the structure, layers, dependency direction, and module boundaries that all backend code MUST follow.

Execution rules (the operating rules an AI agent or contributor follows when writing code) live in [AGENTS.md](AGENTS.md). Practical step-by-step guides live under [docs/](docs/README.md). When in doubt, this document wins on architecture; `AGENTS.md` wins on procedure.

---

## 1. Architectural style

The project is a **feature-first backend** organized around **Clean Architecture**. The codebase is split in two top-level concerns:

- **`src/modules/<feature>/`** — feature modules. Each module owns its full vertical: domain, application, infrastructure, presentation. Modules are the unit of architectural ownership.
- **`src/core/`** — cross-cutting infrastructure and primitives that are not owned by any single feature: configuration, HTTP pipeline, response envelope, validation, logging, persistence service, Redis client, queues, i18n, security middleware, exception filter.

The split is enforced by ESLint layer rules ([eslint.config.mjs](eslint.config.mjs)). Layer boundaries are mechanical, not stylistic — violations fail CI.

---

## 2. Canonical module layout

A complete module looks like this. All four layers MUST be present unless the module is a documented exception (see §8).

```
src/modules/<feature>/
├── index.ts                     # Public API (REQUIRED — see §6)
├── <feature>.module.ts          # NestJS module: providers, controllers, exports
├── <feature>.tokens.ts          # Injection tokens (Symbol-based)
├── domain/                      # Pure business code, framework-free
│   ├── entities/                # Entity classes
│   ├── value-objects/           # VOs (EmailVO, LocaleVO, etc.)
│   ├── ports/                   # Outbound port interfaces (UserRepositoryPort)
│   └── exceptions/              # Domain-specific exception subclasses
├── application/                 # Use-cases + orchestration
│   ├── use-cases/               # One-per-file OR cohesive grouped slices (§7)
│   ├── exceptions/              # Application-level exception subclasses
│   └── mappers/                 # Domain→response shape mappers
├── infrastructure/              # Adapters that implement domain ports
│   ├── persistence/             # Prisma repositories
│   └── <provider>/              # External providers (better-auth, resend, …)
└── presentation/                # HTTP delivery
    └── http/
        ├── <feature>.controller.ts
        ├── dtos/                # Zod DTOs (one-per-file OR grouped, §7)
        ├── guards/              # Feature-specific guards
        └── decorators/          # Feature-specific decorators
```

Reference implementations:
- [src/modules/users/](src/modules/users/) — full module, one-per-file use-case style.
- [src/modules/auth/](src/modules/auth/) — full module, grouped use-case slices.
- [src/modules/files/](src/modules/files/) — full module with multi-driver infrastructure subfolders.

---

## 3. Layer responsibilities

### 3.1 Domain — `domain/`

**Purpose:** business invariants, entities, value objects, port interfaces. The domain MUST be deployable without NestJS, Prisma, Redis, Fastify, or any HTTP/IO concern.

- **MUST** contain only pure TypeScript.
- **MUST NOT** import `@nestjs/*`, `@prisma/client`, `ioredis`, `nestjs-i18n`, `class-validator`, `class-transformer`, or anything from `application/`, `infrastructure/`, `presentation/`.
- **MAY** define port interfaces (`*.port.ts`) that infrastructure later implements.
- **Allowed file**: [src/modules/users/domain/entities/user.entity.ts](src/modules/users/domain/entities/user.entity.ts).
- **Forbidden file**: a domain entity decorated with `@Entity()` from a Prisma/ORM library.

### 3.2 Application — `application/`

**Purpose:** use cases (single-purpose orchestrators), application-level exceptions, response mappers.

- **MUST** depend only on `domain/` (entities, ports) and other application code.
- **MUST NOT** import Prisma, NestJS, Redis, i18n libs, or anything from `infrastructure/` / `presentation/`.
- **MUST** receive infrastructure dependencies via constructor-injected port interfaces (typed as `domain/ports/*.port.ts`).
- **Allowed file**: [src/modules/users/application/use-cases/create-user.use-case.ts](src/modules/users/application/use-cases/create-user.use-case.ts).
- **Forbidden file**: a use case importing `PrismaService` directly.

### 3.3 Infrastructure — `infrastructure/`

**Purpose:** adapters that implement domain ports against real systems (Prisma, Redis, external HTTP APIs).

- **MUST** implement port interfaces declared in `domain/ports/`.
- **MAY** import Prisma, Redis, and external SDKs.
- **MUST NOT** import anything from `presentation/`.
- **Allowed file**: [src/modules/users/infrastructure/persistence/prisma-user.repository.ts](src/modules/users/infrastructure/persistence/prisma-user.repository.ts).
- **Forbidden file**: a Prisma repository that imports a controller or DTO.

### 3.4 Presentation — `presentation/`

**Purpose:** HTTP delivery — controllers, Zod DTOs, feature-scoped guards and decorators.

- **MUST** use Zod via `createStrictZodDto` for all request bodies/params/queries. `class-validator` is forbidden globally.
- **MUST NOT** import Prisma, Redis, or non-config/non-logger infrastructure paths.
- **MAY** depend on `application/` (use cases) and `domain/` (types only).
- **Allowed file**: [src/modules/users/presentation/http/users.controller.ts](src/modules/users/presentation/http/users.controller.ts).
- **Forbidden file**: a controller that calls `prisma.user.findMany()` directly.

### 3.5 Module wiring — `<feature>.module.ts`, `<feature>.tokens.ts`

- **MUST** declare DI tokens as `Symbol`-keyed `as const` objects in `<feature>.tokens.ts` (e.g., [src/modules/users/users.tokens.ts](src/modules/users/users.tokens.ts)).
- **MUST** wire ports → adapters via `useClass` or `useFactory + inject` in the NestJS module.
- **MUST** explicitly list cross-module-consumable providers in `exports: [...]`.

---

## 4. Dependency direction

The allowed direction is one-way:

```
presentation ─┐
              ├──▶ application ──▶ domain
infrastructure ┘                       ▲
                                       │ (infrastructure implements ports defined in domain)
```

### 4.1 Enforced by ESLint ([eslint.config.mjs](eslint.config.mjs))

- `domain/` MUST NOT import `@nestjs/*`, `@prisma/client`, `ioredis`, `nestjs-i18n`, `class-validator`, `class-transformer`, generated Prisma types, `application/`, `infrastructure/`, `presentation/`, or request context internals.
- `application/` MUST NOT import Prisma, NestJS, Redis, i18n libs, `infrastructure/`, or `presentation/`.
- `presentation/` MUST NOT import Prisma, Redis, or `infrastructure/` (except `core/infrastructure/config/` and `core/infrastructure/logger/`).
- `infrastructure/` MUST NOT import `presentation/`.
- Globally: `class-validator` and `class-transformer` are forbidden in all of `src/`.
- Prisma (`@prisma/client`, generated types) MUST NOT be imported outside `infrastructure/` or `core/db/prisma/`.

### 4.2 Cross-module public API enforcement (ESLint-enforced)

- Cross-module imports MUST go through the consumed module's root `index.ts` barrel (see §6). This is now **enforced by ESLint** via `crossModuleDeepRestricted` patterns in [eslint.config.mjs](eslint.config.mjs) — deep imports into `#src/modules/<feature>/<layer>/...` from outside that feature will fail CI.
- **NestJS module classes** (`<feature>.module.ts`) are NOT re-exported from barrels to avoid ESM circular initialization. Consuming `.module.ts` files import the module class directly from `#src/modules/<feature>/<feature>.module.js`.
- **One documented exception**: [src/core/infrastructure/redis/redis.keys.ts](src/core/infrastructure/redis/redis.keys.ts) imports cache-key constants directly from `auth/application/auth.cache.js` and `rbac/application/rbac.cache-keys.js` because barrel imports would create a circular dependency (core → module barrel → module.ts → core). This file is exempt from the cross-module ESLint rule.
- Avoid circular module dependencies. When unavoidable (e.g., `users` ↔ `auth`), use `forwardRef()` and document the cycle.

---

## 5. Cross-module integration

When feature A needs something from feature B:

1. **Feature B exports** the public surface (tokens, port interfaces, application services, response DTOs, guards, decorators) from its root `index.ts`. The **NestJS module class** is imported directly from `<feature>.module.js` (not from the barrel — see §4.2).
2. **Feature A imports** Feature B's NestJS module class (`imports: [BModule]`) directly from `#src/modules/B/B.module.js` and injects exported providers via tokens declared in `b.tokens.js`.
3. **Feature A imports types, services, guards, and decorators** only from `#src/modules/B/index.js` (the barrel) — never from `#src/modules/B/<layer>/...`.

For asynchronous, eventual cross-feature work (notifications, audit), use a job queue (BullMQ) instead of a synchronous import.

### 5.1 Cross-module dependency map

All cross-module imports now use barrel imports. ESLint enforcement is active. No legacy deep imports remain.

| Consumer | Provider | What is consumed | Style |
|----------|----------|------------------|-------|
| Auth | Users | `UserRepositoryPort`, `UserResponseDto` | Barrel (`users/index.js`) |
| Auth | RBAC | `EffectivePermissionsService`, `RoleRepositoryPort`, `RbacGuard`, `Roles` | Barrel (`rbac/index.js`) |
| Auth | Notify | `EmailProviderPort` | Barrel (`notify/index.js`) |
| Users | Auth | `AuthProviderPort`, `AUTH_TOKENS`, `AuthGuard` | Barrel (`auth/index.js`) |
| Users | RBAC | `EffectivePermissionsService`, `RoleRepositoryPort`, `GrantsRepositoryPort`, `RBAC_TOKENS`, `RbacGuard`, `Roles`, `Permissions`, `RoleResponseDto` | Barrel (`rbac/index.js`) |
| Files | RBAC | `RbacGuard`, `Permissions` | Barrel (`rbac/index.js`) |
| RBAC | Auth | `AuthGuard` | Barrel (`auth/index.js`) |
| Core | Auth, RBAC | `AuthCacheKeys`, `rbacCacheKeys` | Justified deep import (documented exception, §4.2) |
| All `.module.ts` | Other modules | `XModule` class | Direct file import (`<feature>.module.js`) |

---

## 6. Public API boundary

**Every feature module MUST expose exactly one `index.ts` at the module root.** Cross-module consumers MUST import types, services, guards, decorators, and DTOs only from `#src/modules/<feature>/index.js` — never from a sub-path. This is **ESLint-enforced** (§4.2).

**NestJS module classes** are the ONE exception: they are NOT re-exported from the barrel (to avoid ESM circular initialization). Consuming `.module.ts` files import the module class directly from `#src/modules/<feature>/<feature>.module.js`.

```ts
// ✅ Correct — public API via barrel
import { USERS_TOKENS, type UserRepositoryPort } from '#src/modules/users/index.js';

// ✅ Correct — NestJS module class via direct file (exception)
import { UsersModule } from '#src/modules/users/users.module.js';

// ❌ Forbidden — deep import past the barrel (ESLint will reject)
import { CreateUserUseCase } from '#src/modules/users/application/use-cases/create-user.use-case.js';
```

Rules for the barrel itself:

- **MUST** re-export `<feature>.tokens.ts` (when tokens exist).
- **MUST** re-export every type and runtime symbol that other modules need: port interfaces, application services, response DTOs, guards, decorators, public exception types.
- **MUST NOT** re-export the NestJS module class (to prevent ESM circular initialization through controller → guard → barrel chains).
- **MUST NOT** re-export internal helpers, mappers, infrastructure adapters, controllers, or anything that should not be reachable from outside.
- **MAY** re-export via intermediate layer barrels (`./application/index.js`, `./domain/index.js`) when that grouping is cleaner, as in [src/modules/auth/index.ts](src/modules/auth/index.ts). Layer barrels MUST NOT include controllers.

Inside a feature, code MUST use **relative imports**:

```ts
// ✅ Inside src/modules/users/...
import { User } from '../entities/user.entity.js';

// ❌ Inside src/modules/users/... — do not self-reference via #src
import { User } from '#src/modules/users/domain/entities/user.entity.js';
```

The `#src/` alias is reserved for `core/` references and (via the barrel) cross-module references.

---

## 7. File-count optimization policy

The codebase deliberately tolerates two file styles: **one-per-file** (used in `users`) and **grouped slices** (used in `auth`). Both are valid. The rule is *cohesion + size*, not file count.

### 7.1 MAY merge

- **Use cases** that share a single bounded concern MAY live in one file (e.g., `auth.password.use-cases.ts` holds `RequestPasswordReset`, `ResetPassword`, `ChangePassword`).
- **Request/response DTOs** that belong to a single controller MAY live in one file (e.g., [src/modules/files/presentation/files.dto.ts](src/modules/files/presentation/files.dto.ts)).
- **Port interfaces** that form a small, cohesive set for one feature MAY live in one file (e.g., `auth.ports.ts`).
- **Cache key constants** for a feature MAY live in one file (`<feature>.cache-keys.ts`).

### 7.2 MUST NOT merge

- Files spanning **multiple architectural layers** (e.g., a domain entity and an application use case in one file).
- A controller and its DTOs in the same file.
- A repository adapter and its Prisma↔domain mapper in the same file.
- A domain entity and its value objects in the same file.
- Two unrelated concerns under a misleadingly generic name (`utils.ts`, `helpers.ts` are forbidden — name files after their contents).

### 7.3 MUST split when

- File exceeds **~400 LOC**.
- File contains **more than ~6 exported use cases** or DTOs.
- File mixes more than one bounded concern (e.g., session-related use cases drifting into permission-related logic).
- A reviewer cannot describe the file's purpose in one sentence.

These thresholds are heuristics, not hard limits. The intent is: keep files small enough that an AI agent can hold the whole thing in working memory, but not so granular that 30 files each export one 5-line function.

---

## 8. Shared / core responsibilities

### 8.1 What lives in `core/`

`core/` owns cross-cutting infrastructure that is genuinely shared across modules and has no feature-specific domain meaning:

- **`core/infrastructure/config/`** — `AppConfigService`, environment schema (`env.schema.ts`). The only place that reads `process.env`.
- **`core/infrastructure/db/`** — `PrismaService` (global Prisma client).
- **`core/infrastructure/redis/`** — `RedisService` wrapper around `ioredis`.
- **`core/infrastructure/queue/`** — BullMQ wiring.
- **`core/infrastructure/i18n/`** — i18n module setup.
- **`core/infrastructure/logger/`** — Pino logger wiring with request-scoped context.
- **`core/infrastructure/context/`** — request context store.
- **`core/presentation/`** — global response interceptor (envelope), exception filter, validation pipe, security headers, CSRF, rate-limit, CORS, OpenAPI/Scalar setup.
- **`core/domain/exceptions/`** — `AppException` base, `AppErrorCode`, `ERROR_DEFINITIONS`.

### 8.2 What MUST stay feature-owned

- Domain entities and value objects of a feature.
- Feature-specific exception subclasses (`UsersException`, `AuthException`, `RbacException`).
- Feature-specific port interfaces.
- Feature-specific cache key constants and TTLs.
- Feature-specific response mappers.
- Feature-specific guards and decorators (e.g., `RbacGuard` belongs to `rbac`, not to `core`).

### 8.3 When to extract to `core/`

Apply the **three-signal rule**. Extract only if **all three** are true:

1. The code is needed by **two or more features**.
2. The code has **no feature-specific domain meaning** (it does not encode the rules of any one feature).
3. The code is **framework infrastructure or a cross-cutting concern** (logging, persistence client, HTTP pipeline, validation, request context, security primitives).

If any signal is false, the code stays in the feature that owns the concept. See [docs/shared-core-extraction.md](docs/shared-core-extraction.md) for examples and false positives.

---

## 9. Architectural drift — anti-patterns

The following are **forbidden** in new code. A code review or AI agent finding any of these MUST reject the change:

- **Deep cross-module imports** (`#src/modules/<other>/<layer>/...`) in new code. Use the module barrel.
- **Prisma in `application/` or `presentation/`** — Prisma belongs in `infrastructure/` only.
- **`class-validator` or `class-transformer` anywhere.** Validation is Zod via `createStrictZodDto`.
- **`process.env` reads in runtime application code.** Use the injected `AppConfigService`. The only legitimate `process.env` usage is in bootstrap/config-loader code (`core/app.bootstrap.ts`, `core/infrastructure/config/app-config.module.ts`) where `AppConfigService` does not yet exist, and in seed/test scripts outside `src/`.
- **`console.log/info/warn/error` anywhere in `src/`.** Use the injected Pino logger.
- **`@SkipEnvelope()` outside documented webhook handlers.** Every other endpoint MUST use the global response envelope.
- **Catching `AppException` to swallow it.** Let it propagate to the global exception filter.
- **`utils.ts` / `helpers.ts` / `misc.ts` dumping grounds.** Name files after their actual contents.
- **A second path alias.** Only `#src/` is allowed (TypeScript paths + Node `imports` field).
- **`eslint-disable` on layer-boundary or import-restriction rules.** The rule is the architecture.
- **Silent circular module dependencies without `forwardRef()` and a documented reason.**
- **A new dependency without explicit approval in the PR description.** See [AGENTS.md](AGENTS.md).

---

## 10. Documented exceptions (partial modules)

Three modules deliberately do not have a full four-layer layout. These are **legitimate exceptions**, not drift:

- **`notify`** ([src/modules/notify/](src/modules/notify/)) — infrastructure-bound: it owns one port (`EmailProviderPort`) in `domain/`, exception types under `domain/exceptions/`, and adapters in `infrastructure/` (Resend client, BullMQ producer/consumer). It has no use cases of its own — sending an email is triggered by other modules' use cases enqueuing a job. It exposes only the port and the module class.
- **`health`** ([src/modules/health/](src/modules/health/)) — minimal probe module: a single controller (`/health`) that pings DB and Redis. No domain or business logic justifies introducing the four layers.
- **`shared`** ([src/modules/shared/](src/modules/shared/)) — reserved for cross-feature DI scope wiring. It currently exposes shared cache binding only; new business behavior must not be added here.

If any of these grows new business behavior, it MUST adopt the full four-layer layout before that behavior ships.

---

## 11. Runtime note (ESM / NodeNext)

- TypeScript: `module: NodeNext`, `strict`, ES2023.
- The `paths` mapping in [tsconfig.json](tsconfig.json) is a TypeScript compile-time alias.
- Runtime resolution uses Node.js subpath imports (`"imports": { "#src/*": "./dist/src/*" }` in [package.json](package.json)).
- Imports MUST include the `.js` extension (NodeNext requires it). This applies to relative and `#src/` imports alike.
- The `#src/` alias uses `#` (not `@`) to avoid collisions with npm-scoped packages (`@nestjs/...`, `@prisma/...`).
