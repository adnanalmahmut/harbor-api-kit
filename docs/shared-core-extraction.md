# Shared code extraction

This document operationalizes [ARCHITECTURE.md §7](../ARCHITECTURE.md#7-common-vs-feature-owned). The question it answers is: *where does this code belong — in a shared directory or in a feature?*

There are three shared destinations, and they are not interchangeable:

| Destination | Holds |
|---|---|
| `src/common/` | cross-cutting code with **no Nest module of its own** — one flat file per concern, the role in the file name |
| `src/infrastructure/` | one folder per external-system **capability**, complete with its port, adapter, module and consumers — cache, rate-limit, i18n, logger, queue |
| `src/persistence/` | the database. Nothing else ever goes here; see [persistence.md](persistence.md) |

The default answer is **feature**. Extract only when the three-signal rule is satisfied.

---

## 1. The three-signal rule

Extract shared code only if **all three** are true:

1. **Used by ≥ 2 features.** Not "could be used by". Actually used.
2. **No feature-specific domain meaning.** It does not encode the rules of any one feature.
3. **Framework infrastructure or a cross-cutting concern.** Logging, database client, HTTP pipeline, validation, request context, security primitives, exception base.

If any signal is false, the code stays where it is. Move it later, not now — premature extraction is a far more common mistake than late extraction in this codebase.

---

## 2. True positives

| Code | Path | Why |
|------|------|-----|
| `PrismaService`, repository adapters, `TransactionManager` | `src/persistence/` | The database. Confined by design — [persistence.md](persistence.md). |
| `RedisService`, `CachePort`, `CacheTTL`, `getOrLoad` | `src/infrastructure/cache/` | Framework infra; cache + session store. One capability, one folder. |
| Namespaced configuration factories + schemas | `src/config/` | Cross-cutting bootstrap concern; the only runtime folder that reads `process.env`. |
| Pino logger wiring | `src/infrastructure/logger/` | Cross-cutting; correlation IDs across modules. |
| BullMQ wiring | `src/infrastructure/queue/` | Framework infra; enqueue from anywhere. |
| i18n module setup | `src/infrastructure/i18n/` | Cross-cutting; controllers and the exception filter both translate. |
| Request context store | `src/common/request-context.ts` | Cross-cutting; plain functions over `AsyncLocalStorage`, no module. |
| Global response interceptor (envelope) | `src/common/response.interceptor.ts` | Cross-cutting; every endpoint. |
| Global exception filter | `src/common/global-exception.filter.ts` | Cross-cutting; every exception. |
| Validation pipe + `createStrictZodDto` | `src/common/validation.pipe.ts` | Cross-cutting; every controller. |
| CSRF, CORS, OpenAPI setup | `src/common/csrf.guard.ts`, `cors.ts`, `swagger.ts` | Cross-cutting; the HTTP pipeline. |
| Rate limiting (port, adapter, module, interceptor, decorators) | `src/infrastructure/rate-limit/` | An external-system capability, not a `common/` concern. |
| `AppException`, `AppErrorCode`, `ERROR_DEFINITIONS` | `src/common/app-exception.ts` | Cross-cutting; the base every feature exception extends. |

---

## 3. False positives — these MUST stay feature-owned

These look "shared" because more than one feature touches them, but they fail signal #2 (they encode feature-specific domain meaning):

| Code | Where it belongs | Why **not** shared |
|------|------------------|---------------------|
| `AuthGuard`, `PermissionsGuard`, session types | `auth` / `authorization` modules | They encode authentication and authorization rules. Other features import them directly from the owning module. |
| `Permissions` decorator | `authorization` module | Same — authorization-specific semantics. |
| `UserPermissionsResponseDto` | `authorization` module | Response shapes are owned by the feature whose concept they represent. |
| `EmailProviderPort`, `AuthEmailPort` and the Resend adapter | `notify` module | Notifications are a feature even when async. |
| `permissions.catalog.ts`, `permission-key.vo.ts` | `authorization` module | Pure authorization knowledge. Being framework-free does not make it shared. |
| Cache key prefixes for auth / authorization | `auth.cache-keys.ts`, `authorization.cache-keys.ts` | Each feature owns its own cache namespace. |
| Feature-specific exception subclasses | `<feature>/<feature>.exception.ts` | They extend `AppException` (shared) but encode feature semantics. |
| Response mappers | The owning feature, e.g. `files.mapper.ts` | They translate that feature's entity to its response shape. |
| A feature's repository port | `<feature>/<feature>.repository.ts` | It describes what *one* feature needs from storage. Never shared, and never public across modules. |

---

## 4. The "two features need it" trap

When a second feature starts importing from a first feature, the temptation is to "extract to shared." Resist.

Walk through the three signals first:

- **Signal 1 (≥ 2 features)**: yes.
- **Signal 2 (no feature-specific meaning)**: usually **no** — guards, ports, response shapes, decorators all encode feature semantics.
- **Signal 3 (framework / cross-cutting)**: usually **no** — these are domain artifacts dressed in framework decorators.

If signals 2 or 3 fail, the right answer is: **the feature that owns the concept exposes it, and the consumer imports it from there.** That is what cross-module integration *is* — it is not a signal that extraction is needed.

Example: `PermissionsGuard` is needed by `authorization` and `files`. It does **not** belong in `src/common/` — it belongs to `authorization`, and `files` imports it from `#src/modules/authorization/permissions.guard.js`.

---

## 5. The "could be useful elsewhere" trap

Speculative extraction is forbidden. If exactly one feature uses a piece of code today, it stays in that feature, even if you can imagine a future use. The cost of extraction is paid now (extra abstraction, indirection); the benefit only arrives when the second consumer actually exists.

If the second consumer arrives later, **then** apply the three-signal rule and consider extraction.

---

## 6. Procedure for legitimate extraction

When the three signals are satisfied:

1. Open a PR whose **sole purpose** is the extraction. Do not bundle it with feature work.
2. Pick the destination from the table at the top: `common/` for code with no Nest module, `infrastructure/` for a module wrapping an external system.
3. Move the code and update consumers to import the file directly. There are no barrels to update.
4. If the code needs to be injectable, it belongs in `infrastructure/<name>/` with its own `<name>.module.ts`. `src/common/` has no module: code there is either a plain function or a class the bootstrap constructs itself.
5. Update [ARCHITECTURE.md §7.1](../ARCHITECTURE.md#71-what-lives-in-srccommon) and, if relevant, this document.
6. Verify lint, build, and tests pass.

---

## 7. Procedure for de-extraction (rare but valid)

If a piece of `src/common/` turns out to be used by only one feature and encodes that feature's semantics, move it back into the feature. Same procedure in reverse, with documentation updates.

The restructure did exactly this in three places worth knowing about: `LoggerPort` was deleted (its only consumer now injects `PinoLogger` directly); the `shared` module was folded into `CommonModule` because "shared" named a location rather than a concern; and `CommonModule` itself was later deleted along with `RequestContextStorePort`, once it was clear the port guarded an `AsyncLocalStorage` that nothing would ever swap.
