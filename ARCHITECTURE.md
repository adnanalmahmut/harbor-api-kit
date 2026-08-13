# ARCHITECTURE

This document is the **authoritative architectural reference** for `harbor-api-kit`. It defines the structure, dependency direction, and module boundaries that all backend code MUST follow.

Execution rules (the operating rules an AI agent or contributor follows when writing code) live in [AGENTS.md](AGENTS.md). Practical step-by-step guides live under [docs/](docs/README.md). When in doubt, this document wins on architecture; `AGENTS.md` wins on procedure.

---

## 1. Architectural style

The project is a **feature-first backend** in the standard NestJS resource shape — controller, service, DTOs, entities — with **one addition**: a repository seam that keeps the database library replaceable.

Five properties define the style:

1. **Flat.** One folder per feature, no layer sub-folders. The file name carries the role (`.controller.ts`, `.service.ts`, `.repository.ts`, `.dto.ts`, `.entity.ts`).
2. **One service per feature.** Behaviour is methods on `<feature>.service.ts`, not one class per use case.
3. **DI by class.** `constructor(private readonly filesService: FilesService)`. Abstract classes double as injection tokens; there are no `*_TOKENS` symbol maps and almost no `useFactory`.
4. **No barrels.** No `index.ts` in feature modules. Imports name the file they come from.
5. **Co-located specs**, wired through `Test.createTestingModule`.

Top-level concerns:

| Directory | Owns |
|---|---|
| `src/modules/<feature>/` | feature verticals — the unit of architectural ownership |
| `src/common/` | cross-cutting code with no Nest module — one flat file per concern, the role in the name |
| `src/config/` | namespaced `registerAs` configuration factories + Zod env schemas |
| `src/infrastructure/` | one folder per external-system capability, each complete: cache, rate-limit, i18n, logger, queue |
| `src/persistence/` | the database — `PrismaService`, repository adapters, `TransactionManager` |

The boundaries that matter are enforced by ESLint ([eslint.config.mjs](eslint.config.mjs)) and fail CI.

---

## 2. Canonical module layout

```
src/modules/<feature>/
├── <feature>.module.ts           # NestJS module: providers, controllers, exports
├── <feature>.controller.ts       # HTTP delivery only — no business logic
├── <feature>.controller.spec.ts
├── <feature>.service.ts          # the behaviour
├── <feature>.service.spec.ts
├── <feature>.repository.ts       # abstract class = the persistence port AND the DI token
├── <feature>.exception.ts        # AppException subclass
├── <feature>.dto.ts              # Zod request DTOs, response DTOs, OpenAPI contract
├── <name>.entity.ts              # plain classes we own — never a Prisma type
├── <name>.guard.ts               # the guard, its decorator and its metadata key
└── <sub-concern>/                # a real second seam, e.g. files/storage/
```

The folder is **flat**. The role is in the file name, so `dto/`, `entities/`,
`guards/` and `decorators/` are not used — grouping by kind is the
directory-level form of the layer folders §1 forbids. The only sub-folder in
the repo is `files/storage/`, and it qualifies because it is a swappable seam
with its own port, not a bucket of same-kind files. A vendor boundary is
carried by a file prefix (`better-auth.ts`, `better-auth.registrar.ts`), not by
a folder. See [docs/file-organization.md §2](docs/file-organization.md).

The Prisma implementation of `<feature>.repository.ts` does **not** live here — see §5.

Reference implementations:
- [src/modules/health/](src/modules/health/) — the minimal shape (6 files).
- [src/modules/files/](src/modules/files/) — a full feature with a second swappable seam (`storage/`).
- [src/modules/authorization/](src/modules/authorization/) — a feature with real domain logic kept as plain root-level files.
- [src/modules/auth/](src/modules/auth/) — a feature wrapping a vendor library behind the `better-auth.` file prefix.

---

## 3. Role responsibilities

### 3.1 Controller — `<feature>.controller.ts`

HTTP delivery and nothing else: route, guards, DTO binding, `@ApiResponses`, `@ResponseMessage`, and one call into the service.

- **MUST** validate every body/param/query with Zod via `createStrictZodDto`. `class-validator` is forbidden globally.
- **MUST NOT** contain business rules, and MUST NOT touch a repository or Prisma.
- Allowed: [src/modules/authorization/authorization.controller.ts](src/modules/authorization/authorization.controller.ts).
- Forbidden: a controller calling `prisma.user.findMany()`.

### 3.2 Service — `<feature>.service.ts`

All behaviour for the feature, as `@Injectable()` methods.

- **MUST** depend on the abstract repository, not on `PrismaService`.
- **MUST** compose multi-repository writes through `TransactionManager`, never `$transaction`.
- **MAY** grow a second service when it crosses the size threshold in §6 — prefer `<sub-concern>.service.ts` over a 900-line god object.

### 3.3 Repository port — `<feature>.repository.ts`

An `abstract class` describing what the feature needs from storage-of-record, in the feature's own types. This is the single most important file for keeping Prisma replaceable; the rules are in [docs/persistence.md](docs/persistence.md).

### 3.4 Entities — `entities/`

Plain classes we own. Adapters map row → entity. A raw database row must never escape `src/persistence/`.

### 3.5 Other ports

A port is justified when there is a **real choice of implementation**, not as ceremony. The ones that exist:

| Port | Implementations |
|---|---|
| `StorageDriverPort` | local disk, S3-compatible |
| `EmailProviderPort` | BullMQ queue → Resend worker |
| `AuthEmailPort` | notify module |
| `CachePort` | Redis |
| `DbHealthPort`, `CacheHealthPort` | Prisma, Redis |
| `<Feature>Repository` | Prisma |
| `TransactionManager` | Prisma |
| `AuthConfigPort`, `SessionTrackerPort` | auth adapters |

All are abstract classes, so the port is also the token: `{ provide: StorageDriverPort, useClass: S3Driver }`.

### 3.6 Module wiring — `<feature>.module.ts`

- **MUST** bind port → implementation with `useClass` / `useExisting`.
- **MUST NOT** declare `Symbol` token maps. The one legitimate symbol in the codebase is [`BETTER_AUTH`](src/modules/auth/better-auth.ts), because Better Auth's instance is a factory-built plain object and not a class.
- **MUST NOT** list its own repository in `providers` — `PersistenceModule` is `@Global()` and supplies it.
- **MUST** list cross-module-consumable providers in `exports`.

---

## 4. Dependency direction

```
controller ──▶ service ──▶ <feature>.repository (abstract)
                  │                    ▲
                  │                    │ implements
                  ▼                    │
            other ports    src/persistence/prisma/*.prisma.repository.ts
```

Enforced by ESLint:

1. **Prisma is confined to `src/persistence/**`.** `@prisma/client` and `#src/generated/prisma/**` are restricted everywhere else, and `#src/persistence/prisma/**` is importable only from inside `src/persistence/**`.
2. **`class-validator` / `class-transformer` are forbidden** in all of `src/`.
3. **Direct Redis clients** (`ioredis`, `redis`) belong to `src/infrastructure/cache/` — everything else injects `CachePort` or `RedisService`.
4. **Another module's repository is not public.** `#src/modules/*/*.repository.js` is off-limits across module boundaries; collaborate through the exported service.

One documented exception exists, scoped by an ESLint allowlist to two files: Better Auth's `prismaAdapter` needs the client itself. See §5 and [docs/persistence.md](docs/persistence.md#4-the-one-accepted-exception-better-auth).

### 4.1 Cycles

Avoid circular module dependencies. Where unavoidable — `auth` ↔ `authorization`: auth guards its Better Auth admin routes with `EffectivePermissionsService`, while authorization's own controller needs `AuthGuard` — use `forwardRef()` on **both** sides and document the reason at the import.

---

## 5. Persistence

`src/persistence/` is the composition root for data access and the only place the application names a database library.

```
src/persistence/
├── persistence.module.ts        # @Global() — binds every repository port to its adapter
├── transaction.manager.ts       # abstract TransactionManager (the public port)
├── database.exception.ts
└── prisma/
    ├── prisma.service.ts
    ├── prisma-transaction.manager.ts
    ├── prisma-error.mapper.ts
    └── <feature>.prisma.repository.ts
```

Replacing Prisma is: add a sibling folder, implement the same repository classes, change the `useClass` entries in one file. Feature modules do not change, because none of them import from here.

The seven rules that make that true — port types, entity mapping, error-code translation, the transaction port, forbidden value types — are in **[docs/persistence.md](docs/persistence.md)**. Read that before writing a repository.

---

## 6. File-size policy

Cohesion and size, not file count.

**MAY group**: all DTOs and the OpenAPI contract for one controller (`files.dto.ts`); a small cohesive port set (`auth.ports.ts`, `health.ports.ts`, `notify.ports.ts`); cache keys per feature (`<feature>.cache-keys.ts`).

**MUST NOT group**: a controller with its DTOs; a repository port with its adapter (different directories by design); two unrelated concerns under a generic name — `utils.ts`, `helpers.ts`, `misc.ts` are forbidden, name files after their contents.

**MUST split when**: a file passes ~400 LOC; a service passes ~10 public methods; the file mixes more than one bounded concern; you cannot state the file's purpose in one sentence without "and".

These are heuristics. A 410-line file with one tightly-coupled concern is fine; a 250-line file mixing two is not.

---

## 7. `common/` vs feature-owned

### 7.1 What lives in `src/common/`

Cross-cutting code with no feature meaning and no Nest module of its own. It is **flat** — the role is in the file name, exactly as in a feature folder, and there are no sub-folders:

| File | Holds |
|---|---|
| `app-exception.ts` | `AppErrorCode`, `ERROR_DEFINITIONS`, `AppException` and its subclasses, `ValidationIssue` |
| `request-context.ts` | the `RequestContext` type, the `AsyncLocalStorage` store, the Fastify hook that opens it |
| `response.interceptor.ts` | the `{ success, message, data }` envelope, `@ResponseMessage`, `@SkipEnvelope` |
| `global-exception.filter.ts` | the catch-all filter, the error response shapes |
| `validation.pipe.ts` | the Zod pipe and `createStrictZodDto` |
| `csrf.guard.ts` | the guard, `@CsrfExempt`, token and origin helpers |
| `cors.ts`, `swagger.ts`, `api-errors.decorator.ts`, `utils.ts` | |

`src/common/` has **no Nest module**. The request context is reached through three exported functions — `getRequestContext`, `setRequestContext`, `runWithRequestContext` — not through an injected port.

`src/infrastructure/` holds one folder per external-system capability, each complete and each flat: `cache/` (the Redis client, `CachePort`, `CacheTTL`, the `getOrLoad` read-through), `rate-limit/` (the port with its Redis adapter, the decorators, one interceptor covering all three scopes, the module), `i18n/`, `logger/`, `queue/`. `src/config/` is the only runtime folder that reads `process.env`, and it owns the supported-locale catalogue that its schemas validate against.

The organising rule is **one capability, one folder**. Splitting a capability by kind — the port here, the adapter there, the interceptors somewhere else — is the same mistake as splitting a feature by layer.

### 7.2 What MUST stay feature-owned

Entities and value objects; the feature's exception subclass (`AuthException`, `AuthorizationException`, `FilesException`, `NotifyException`); its repository port; its cache keys and TTLs; its response mappers; its guards and decorators (`PermissionsGuard` belongs to `authorization`, not to `common`).

### 7.3 When to extract

The **three-signal rule** — extract only if all three hold:

1. two or more features need it;
2. it encodes no feature's rules;
3. it is framework infrastructure or a cross-cutting concern.

If any signal is false, it stays with the feature that owns the concept. See [docs/shared-core-extraction.md](docs/shared-core-extraction.md).

---

## 8. Architectural drift — anti-patterns

Forbidden in new code; a reviewer or agent finding any of these MUST reject the change:

- **Prisma outside `src/persistence/`** — including a service that injects `PrismaService`.
- **A repository port that names a Prisma type** (`Prisma.XWhereInput`, a generated model, `Decimal`, `JsonValue`).
- **`$transaction` outside `src/persistence/prisma/`** — use `TransactionManager.run()`.
- **A Prisma error code leaking out of an adapter** — translate `P2025`/`P2002` there.
- **A `*_TOKENS` symbol map.** Abstract classes are the tokens.
- **A new `index.ts` barrel** inside a feature module. Import the file.
- **A layer folder** (`domain/`, `application/`, `infrastructure/`, `presentation/`) inside a feature module.
- **`class-validator` or `class-transformer` anywhere.** Validation is Zod via `createStrictZodDto`.
- **`process.env` outside `src/config/`** in runtime code. Inject a namespaced factory via `.KEY` and `ConfigType`. Seed/test scripts outside `src/` may prepare their own environment.
- **`console.log/info/warn/error` in `src/`.** Use the injected Pino logger.
- **`@SkipEnvelope()` outside documented webhook handlers.**
- **Catching `AppException` to swallow it.** Let it reach the global filter.
- **A second path alias.** Only `#src/`.
- **`eslint-disable` on an import-restriction rule.** The rule is the architecture.
- **A silent circular module dependency** without `forwardRef()` and a stated reason.
- **A new dependency without explicit approval** in the PR description. See [AGENTS.md](AGENTS.md).

---

## 9. Deliberate variations

Not every feature has every file, and that is correct:

- **`notify`** has no controller and no repository: nothing calls it over HTTP and it stores nothing. It owns two ports, one service, and provider/queue adapters.
- **`health`** has no repository of its own: it depends on `DbHealthPort` and `CacheHealthPort`, whose Prisma implementation lives in `src/persistence/`.
- **`auth`** has no controller: Better Auth mounts its own routes on the raw Fastify instance via `BetterAuthRouteRegistrar`, deliberately outside the Nest pipeline. See [docs/auth-authorization.md](docs/auth-authorization.md).
- **`authorization`** keeps `permissions.catalog.ts` and `permission-key.vo.ts` as plain root-level files. They are pure, framework-free and unit-tested; they lost the `domain/` folder, not their existence.

---

## 10. Runtime note (ESM / NodeNext)

- TypeScript: `module: NodeNext`, `strict`, ES2023.
- The `paths` mapping in [tsconfig.json](tsconfig.json) is a compile-time alias only.
- Runtime resolution uses Node.js subpath imports (`"imports": { "#src/*": "./dist/src/*" }` in [package.json](package.json)).
- Imports MUST carry the `.js` extension — relative and `#src/` alike.
- The alias uses `#` (not `@`) to avoid collisions with npm-scoped packages.
