# Module boundaries

This document operationalizes the import rules from [ARCHITECTURE.md §4](../ARCHITECTURE.md#4-dependency-direction). When in doubt, the architecture document wins.

The layout has no layer folders and no barrels, so there are far fewer rules than there used to be — but the ones that remain are the load-bearing ones, and all four are machine-enforced in [eslint.config.mjs](../eslint.config.mjs).

---

## 1. The four allowed import shapes

| Source | Example | When |
|--------|---------|------|
| **Same module, relative** | `import { PermissionKeyVO } from './permission-key.vo.js';` | In-module references. The default. |
| **`#src/common/…`, `#src/config/…`, `#src/infrastructure/…`** | `import { ResponseMessage } from '#src/common/response.interceptor.js';` | Cross-cutting code. Name the file. |
| **`#src/modules/<other>/<file>.js`** | `import { AuthGuard } from '#src/modules/auth/auth.guard.js';` | Cross-module references — a direct file import, since there is no barrel. |
| **External package** | `import { Module } from '@nestjs/common';` | Subject to the restrictions below. |

Self-referencing your own module through `#src/` is wrong — use a relative path:

```ts
// ✅ inside src/modules/authorization/
import { PermissionKeyVO } from './permission-key.vo.js';

// ❌ inside src/modules/authorization/
import { PermissionKeyVO } from '#src/modules/authorization/permission-key.vo.js';
```

---

## 2. The four enforced rules

### Rule 1 — Prisma is confined to `src/persistence/**`

```ts
// ❌ anywhere outside src/persistence/
import type { Prisma } from '#src/generated/prisma/client.js';
import { PrismaClient } from '@prisma/client';
```

Also enforced in the other direction: `#src/persistence/prisma/**` and `persistence.module.js` are importable **only from inside `src/persistence/`**. A service that wants data injects the abstract repository; a service that wants atomicity injects `TransactionManager` from `#src/persistence/transaction.manager.js`, which stays public.

The single allowlisted exception is Better Auth's Prisma adapter, scoped to `src/modules/auth/auth.module.ts` and `src/modules/auth/better-auth/better-auth.ts`. See [persistence.md §4](persistence.md#4-the-one-accepted-exception-better-auth).

### Rule 2 — another module's repository is not public

```ts
// ❌ #src/modules/*/*.repository.js from outside that module
import { FileRepository } from '#src/modules/files/files.repository.js';
```

A repository is the private contract between one feature and its storage. Cross-module collaboration goes through the service the other module exports:

```ts
// ✅
@Module({ imports: [FilesModule] })          // FilesModule exports FilesService
// …then inject FilesService
```

### Rule 3 — validation is Zod

`class-validator` and `class-transformer` are forbidden in all of `src/`. Request DTOs use `createStrictZodDto`.

### Rule 4 — Redis clients belong to the cache capability

`ioredis` and `redis` may only be imported inside `src/infrastructure/cache/`. Everything else injects `CachePort` (the abstract cache slice) or `RedisService` (when it needs raw commands, as the auth session tracker does).

---

## 3. What is *not* enforced any more, and why

The old config had eleven per-layer blocks forbidding `@nestjs/*` in `domain/`, `infrastructure/` in `application/`, and so on. Those rules existed to keep use-case classes framework-agnostic. Services are now `@Injectable()` by design, so the rules would forbid the intended style. They are gone.

What replaced them is not a weaker guarantee — it is a narrower and truer one: the thing actually worth protecting is the **database boundary**, and that is now enforced from both sides.

---

## 4. Cross-cutting code

`src/common/`, `src/config/` and `src/infrastructure/` MUST NOT import from any feature module. If one of them needs to, the code belongs in a feature — see [shared-core-extraction.md](shared-core-extraction.md).

There are no exceptions: nothing under those three directories imports a feature module.

`src/persistence/` is the deliberate inverse: it imports repository ports and exception classes **from** feature modules, because it implements what those features declare. That direction is correct and is what makes the composition root work.

---

## 5. Circular dependencies

- Use `forwardRef(() => OtherModule)` on **both** sides.
- Document the reason with a one-line comment at the import site.
- A new cycle MUST be justified in the PR description. Prefer redesigning to avoid it.

The one cycle in the repo: `auth` ↔ `authorization`. Auth guards its Better Auth admin routes with `EffectivePermissionsService`; authorization's own controller needs `AuthGuard`.

---

## 6. Quick decision table

| You need to … | Do this |
|---------------|---------|
| Reference an entity in the same module | Relative import. |
| Read or write the database | Inject the feature's abstract repository. Never `PrismaService`. |
| Write across repositories atomically | Inject `TransactionManager` and use `run()`. Never `$transaction`. |
| Add a repository method | Add it to `<feature>.repository.ts`, then implement in `src/persistence/prisma/`. |
| Use another feature's behaviour | Import its module class, inject the service it exports. |
| Use another feature's guard / decorator / DTO | Direct file import: `#src/modules/<other>/guards/x.guard.js`. |
| Cache something | Inject `CachePort`, and call `getOrLoad(cache, key, loader, ttl, scope)` from the same file for request-scoped or two-tier memoization. |
| Reference runtime configuration | Import the factory from `#src/config/index.js`, inject `<factory>.KEY` with `ConfigType<typeof factory>`. |
| Add an env var | Declare it in the relevant Zod schema under `src/config/`. Never read `process.env` in a consumer. |
| Throw an error | Subclass `AppException` in `<feature>.exception.ts`. Never throw a raw `Error` at a boundary. |
