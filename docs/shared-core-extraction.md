# Shared / core extraction

This document operationalizes [ARCHITECTURE.md §8](../ARCHITECTURE.md#8-shared--core-responsibilities). The question it answers is: *where does this code belong — in `core/` or in a feature?*

The default answer is **feature**. Extract to `core/` only when the three-signal rule is satisfied.

---

## 1. The three-signal rule

Extract code to `core/` only if **all three** are true:

1. **Used by ≥ 2 features.** Not "could be used by". Actually used.
2. **No feature-specific domain meaning.** It does not encode the rules of any one feature.
3. **Framework infrastructure or a cross-cutting concern.** Logging, persistence client, HTTP pipeline, validation, request context, security primitives, exception base.

If any signal is false, the code stays where it is. Move it later, not now — premature extraction is a far more common mistake than late extraction in this codebase.

---

## 2. True positives — these belong in `core/`

| Code | Path | Why |
|------|------|-----|
| `PrismaService` | `core/infrastructure/db/` | Framework infra; every feature persists. |
| `RedisService` | `core/infrastructure/redis/` | Framework infra; cache + session store. |
| `AppConfigService` + env schema | `core/infrastructure/config/` | Cross-cutting; only place that reads `process.env`. |
| Pino logger wiring + request context | `core/infrastructure/logger/`, `core/infrastructure/context/` | Cross-cutting; correlation IDs across modules. |
| BullMQ wiring | `core/infrastructure/queue/` | Framework infra; enqueue from anywhere. |
| i18n module setup | `core/infrastructure/i18n/` | Cross-cutting; controllers and exception filter both translate. |
| Global response interceptor (envelope) | `core/presentation/interceptors/` | Cross-cutting; every endpoint. |
| Global exception filter | `core/presentation/filters/` | Cross-cutting; every exception. |
| Validation pipe + `createStrictZodDto` | `core/presentation/validation/` | Cross-cutting; every controller. |
| CSRF, rate-limit, security headers, CORS | `core/presentation/security/`, `core/presentation/setup/` | Cross-cutting; HTTP pipeline. |
| `AppException`, `AppErrorCode`, `ERROR_DEFINITIONS` | `core/domain/exceptions/` | Cross-cutting; the base every feature exception extends. |

---

## 3. False positives — these MUST stay feature-owned

These look "shared" because more than one feature touches them, but they fail signal #2 (they encode feature-specific domain meaning):

| Code | Where it belongs | Why **not** in core |
|------|------------------|---------------------|
| `AuthGuard`, `RbacGuard`, session types | `auth` / `rbac` modules | They encode the auth/RBAC domain. Other features consume them via the barrel. |
| `Roles`, `Permissions` decorators | `rbac` module | Same — RBAC-specific semantics. |
| `UserResponseDto`, `RoleResponseDto` | `users` / `rbac` modules | Response shapes are owned by the feature whose entity they represent. |
| `EmailProviderPort` and Resend adapter | `notify` module | Notifications are a feature even when async. |
| Permission catalog / RBAC value objects | `rbac` module | Pure domain knowledge of RBAC. |
| Cache key prefixes for auth / RBAC | `auth.cache.ts`, `rbac.cache-keys.ts` | Each feature owns its own cache namespace. |
| Feature-specific exception subclasses | `<feature>/<layer>/exceptions/` | They extend `AppException` (which lives in `core/`) but encode feature semantics. |
| User mappers, role mappers | The owning feature's `application/mappers/` | They translate that feature's domain to its response shape. |

---

## 4. The "two features need it" trap

When a second feature starts importing from a first feature, the temptation is to "extract to shared." Resist.

Walk through the three signals first:

- **Signal 1 (≥ 2 features)**: yes.
- **Signal 2 (no feature-specific meaning)**: usually **no** — guards, ports, response shapes, decorators all encode feature semantics.
- **Signal 3 (framework / cross-cutting)**: usually **no** — these are domain artifacts dressed in framework decorators.

If signals 2 or 3 fail, the right answer is: **the feature that owns the concept exposes it through its barrel**. The consumer imports it from `#src/modules/<owner>/index.js`. That is what cross-module integration *is* — it's not a sign that extraction is needed.

Example: `RbacGuard` is needed by `auth`, `users`, and `files`. It does **not** belong in `core/` — it belongs in `rbac` (because it encodes RBAC semantics) and is consumed via `#src/modules/rbac/index.js`.

---

## 5. The "could be useful elsewhere" trap

Speculative extraction is forbidden. If exactly one feature uses a piece of code today, it stays in that feature, even if you can imagine a future use. The cost of extraction is paid now (extra abstraction, indirection); the benefit only arrives when the second consumer actually exists.

If the second consumer arrives later, **then** apply the three-signal rule and consider extraction.

---

## 6. Procedure for legitimate extraction

When the three signals are satisfied:

1. Open a PR whose **sole purpose** is the extraction. Do not bundle it with feature work.
2. Move the code to the appropriate `core/` subfolder.
3. Update consumers to import from `#src/core/index.js` (or the relevant core barrel).
4. Re-export the new symbol from `core/index.ts` if it is publicly consumable.
5. Update [ARCHITECTURE.md §8.1](../ARCHITECTURE.md#81-what-lives-in-core) and (if relevant) this document.
6. Verify lint, build, and tests pass.

---

## 7. Procedure for de-extraction (rare but valid)

If a piece of `core/` is found to be used by only one feature and encodes that feature's semantics, move it back into the feature. Same procedure as above, in reverse, with documentation updates.
