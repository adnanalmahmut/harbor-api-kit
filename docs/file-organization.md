# File organization

This document operationalizes the file-size policy from [ARCHITECTURE.md §6](../ARCHITECTURE.md#6-file-size-policy).

The layout is the standard NestJS resource shape: role in the file name, no layer folders, no barrels.

---

## 1. Naming conventions

| Concept | File | Class / export |
|---------|------|----------------|
| NestJS module | `<feature>.module.ts` | `{Feature}Module` |
| Controller | `<feature>.controller.ts` | `{Feature}Controller` |
| Service | `<feature>.service.ts` | `{Feature}Service` |
| Second service | `<sub-concern>.service.ts` | `{SubConcern}Service` |
| Repository port | `<feature>.repository.ts` | `abstract class {Feature}Repository` |
| Repository adapter | `src/persistence/prisma/<feature>.prisma.repository.ts` | `Prisma{Feature}Repository` |
| Other port | `<feature>.ports.ts` or `<name>.port.ts` | `abstract class {Name}Port` |
| Adapter for a port | `<name>.adapter.ts` / `<name>.driver.ts` | `{Name}Adapter` / `{Name}Driver` |
| Entity | `<name>.entity.ts` | `{Name}` or `{Name}Entity` |
| Enum owned by an entity | inside `<name>.entity.ts` | `{Name}` |
| Value object | `<name>.vo.ts` | `{Name}VO` |
| DTOs + OpenAPI contract | `<feature>.dto.ts` | one class per DTO, plus `{FEATURE}_RESPONSES` |
| Exception | `<feature>.exception.ts` | `{Feature}Exception extends AppException` |
| Cache keys | `<feature>.cache-keys.ts` | `{feature}CacheKeys` |
| Guard (+ its decorator and metadata key) | `<name>.guard.ts` | `{Name}Guard`, `{Name}` |
| Unit spec | `<file>.spec.ts` | co-located, next to the file it tests |
| Contract test | `test/<module>.contract-spec.ts` | |
| E2E test | `test/<module>.e2e-spec.ts` | |

There is **no** `index.ts` inside a feature module, and **no** `<feature>.tokens.ts` — abstract classes are the DI tokens.

---

## 2. Folder rules

- **A feature folder is flat.** The role goes in the file name, not in a folder name.
- The one sub-folder in the repo is [src/modules/files/storage/](../src/modules/files/storage/), and it earns its place: it is not a group-by-kind bucket but a **second swappable seam** with its own port, two drivers behind it and a validator. That is the only reason to nest.
- `dto/`, `entities/`, `guards/`, `decorators/` are **not** used. Each held one or two files that would never grow, and grouping by kind is the directory-level version of the layer folders a feature is forbidden from having. `nest g resource` emits `dto/` and `entities/`; delete them and flatten.
- A vendor boundary is carried by a **file prefix**, not a folder: `better-auth.ts` and `better-auth.registrar.ts` sit at the auth module root. A folder named `better-auth/` holding files named `better-auth.*` says the same thing twice.
- Do not create a folder that will hold exactly one file forever.
- **Forbidden folder names inside a feature**: `domain/`, `application/`, `infrastructure/`, `presentation/`, `interfaces/`, `use-cases/`, `services/`, `__tests__/`.

### `src/common/` and `src/infrastructure/`

The same rules apply outside features, with one addition.

`src/common/` is **entirely flat** — no sub-folders at all. Grouping by kind
(`filters/`, `interceptors/`, `decorators/`, `types/`, `utils/`) is the
directory-level version of the layer folders a feature is forbidden from having,
and it scatters one concern across five directories: the CSRF guard's constants,
decorator, helpers and the guard itself once lived in four files under
`csrf/`, and the response envelope's interceptor, two decorators, metadata keys
and types lived in four more. Name the file for the concern and the role
(`csrf.guard.ts`, `response.interceptor.ts`) and put everything that concern
needs inside it.

`src/infrastructure/` keeps one folder per capability, and each of those is
flat. A capability is complete: its port, its adapter, its decorators, its
interceptor and its module all sit together. Splitting a capability by kind is
the same mistake as splitting a feature by layer.

---

## 3. Worked examples from the repo

### The minimal feature — `health` (6 files)

```
health.module.ts          binds CacheHealthPort → RedisCacheHealthAdapter
health.controller.ts      GET /health
health.service.ts         pings both dependencies
health.service.spec.ts    overrides both ports
health.ports.ts           DbHealthPort, CacheHealthPort
redis-cache-health.adapter.ts
```

`DbHealthPort`'s implementation is in `src/persistence/prisma/db-health.prisma.adapter.ts` — the health module never learns which database answers.

### A full feature — `files`

```
files.module.ts
files.controller.ts          upload, meta, download, stream, visibility
public-files.controller.ts   token-addressed public access
files.service.ts             every behaviour, ~215 lines
files.repository.ts          abstract FileRepository + Create/Update/Filter props
files.exception.ts
files.mapper.ts (+ .spec.ts) entity → response shape, and local-driver URL normalization
files.dto.ts                 DTOs + FILES_RESPONSES
file.entity.ts               FileEntity + the StorageDriver enum
storage/storage.port.ts      StorageDriverPort, FileValidatorPort
storage/local.driver.ts
storage/s3.driver.ts
storage/file-signature.validator.ts (+ .spec.ts)
```

Eight use-case classes became eight methods on `FilesService`. Two controllers share one service — that is normal, and it is why `PublicFilesController` needs no service of its own.

Which driver serves `StorageDriverPort` is decided by a `useFactory` inside `files.module.ts`: picking an implementation from configuration is module wiring, and wiring does not need a file.

### Real domain logic kept flat — `authorization`

```
authorization.module.ts
authorization.controller.ts
authorization.service.ts (+ .spec.ts)         the five write/read endpoints
effective-permissions.service.ts (+ .spec.ts) role grants + overrides, cached
authorization.repository.ts
authorization.exception.ts
authorization.cache-keys.ts
permissions.catalog.ts        the static policy: roles, statements, grants
permission-key.vo.ts (+ .spec.ts)
permissions.guard.ts          the guard, @Permissions and its metadata key
authorization.dto.ts          request DTOs, response DTOs, USER_PERMISSIONS_RESPONSES
```

Two services, deliberately. `EffectivePermissionsService` is read on every guarded request (including inside the auth module's Better Auth hooks); `AuthorizationService` only serves the write endpoints. Different lifetimes of concern, different files.

`permissions.catalog.ts` is pure and framework-free. Flattening removed its `domain/` folder, not its status. The allow/deny resolution it used to pair with is now the free function `resolvePermissions` in `effective-permissions.service.ts`, beside `checkPermission` — a class with one static method and no state is a function.

### A vendor wrapped without a folder — `auth`

```
auth.module.ts
auth.guard.ts                 session lookup, cached
auth.entities.ts (+ .spec.ts) User, Session, and hydration from the provider payload
auth.cookies.ts               Better Auth Headers ⇄ Fastify set-cookie, both directions
auth.ports.ts  auth-email.adapter.ts  auth.exception.ts
better-auth.ts                the factory, the BETTER_AUTH token, the options
better-auth.registrar.ts      mounts /auth/* on raw Fastify
```

Everything vendor-shaped is still identifiable at a glance, by prefix.

---

## 4. Size thresholds

Split when:

- the file passes **~400 LOC**;
- a service passes **~10 public methods**;
- more than one bounded concern appears in the file. The test: can you state the file's purpose in one sentence without "and" or "or"?

`FilesService` sits at ~215 lines with 7 public methods and is the largest service in the repo — that is the intended ceiling shape. If it grows past the threshold, split by sub-concern (`file-streaming.service.ts`), do not tolerate a god object.

---

## 5. When to refactor an existing file

Refactor (split or merge) only when **all three** hold:

1. you are already touching the file for a feature task, and
2. a threshold above is being violated, and
3. the change can be done cleanly in the same PR.

Drive-by refactors are forbidden ([AGENTS.md §0](../AGENTS.md#0-prime-directives)). If a file violates a threshold but you do not need to touch it, leave it.
