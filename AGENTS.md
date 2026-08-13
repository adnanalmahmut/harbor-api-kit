# AGENTS.md — Operating rules for `harbor-api-kit`

These are **mandatory operating constraints** for any contributor (human or AI agent) writing or reviewing code in this repository. They are not style suggestions. A change that violates these rules MUST be rejected, regardless of how well it solves the stated problem.

Architecture rationale lives in [ARCHITECTURE.md](ARCHITECTURE.md). Practical step-by-step guides live under [docs/](docs/README.md). This file governs *behavior*.

---

## 0. Prime directives

1. **Read before you write.** Open [ARCHITECTURE.md](ARCHITECTURE.md) and the relevant `docs/` page before modifying or scaffolding code.
2. **Follow the feature-addition workflow** in §14 before scaffolding any new feature. Do not invent a new structure.
3. **Single source of truth.** Never clone a utility, type, or rule that already exists. Find it and reuse it.
4. **Minimal diffs.** Change only what the task requires. No drive-by refactors, no opportunistic renames, no docstring sweeps.
5. **Never bypass enforcement.** No `eslint-disable` on layer-boundary or import-restriction rules. No `@ts-ignore` to suppress type errors caused by violating an architectural rule.
6. **If a step is unclear, STOP and ask.** Do not guess at the architecture.

---

## 1. Stack (pinned)

Node.js 22 (ESM) · TypeScript 5.9 · NestJS 11 (Fastify 5) · Prisma 7 + PostgreSQL · Redis (`ioredis`) · BullMQ · better-auth · Resend · Zod v4 + `nestjs-zod` · `nestjs-i18n` (ar-SY default, en-US) · Pino · Swagger + Scalar · Jest + Supertest.

- Versions are pinned in [package.json](package.json). Bumps MUST update tests and any documentation that references the old behavior.
- **No new dependency without explicit approval** in the PR description. Justify why no existing dependency or in-repo utility solves the problem.

---

## 2. Module structure — MUST

- Every feature module is **flat**: role in the file name, no layer folders. `domain/`, `application/`, `infrastructure/`, `presentation/`, `use-cases/` and `interfaces/` are **forbidden** folder names inside a feature.
- Every feature module MUST have `<feature>.module.ts`. It MUST NOT have `index.ts` or `<feature>.tokens.ts`.
- Behaviour goes in `<feature>.service.ts` as methods — **not** one class per use case.
- A feature that stores anything MUST declare `<feature>.repository.ts` as an `abstract class`, and implement it under `src/persistence/prisma/`.
- Deliberate variations (`notify` has no controller, `auth` has none either, `health` owns no repository) are listed in [ARCHITECTURE.md §9](ARCHITECTURE.md#9-deliberate-variations). Do not invent new ones without updating that section.
- For step-by-step scaffolding see [docs/adding-a-feature.md](docs/adding-a-feature.md).

---

## 3. Dependency injection — MUST

- Inject **by class**. Ports are `abstract class`es so they double as tokens: `{ provide: StorageDriverPort, useClass: S3Driver }`.
- MUST NOT introduce a `*_TOKENS` symbol map. The only legitimate symbol token is [`BETTER_AUTH`](src/modules/auth/better-auth/better-auth.token.ts), because Better Auth's instance is a factory-built plain object.
- MUST NOT use `useFactory` where `useClass` works. A `useFactory` needs a comment explaining why.
- A feature module MUST NOT list its own repository in `providers` — `PersistenceModule` is `@Global()` and supplies it.

---

## 4. Boundaries — MUST / MUST NOT (ESLint-enforced)

ESLint enforces these in [eslint.config.mjs](eslint.config.mjs). An agent MUST NOT add `eslint-disable` to bypass them.

- **Prisma is confined to `src/persistence/**`.** `@prisma/client` and `#src/generated/prisma/**` are forbidden elsewhere; `#src/persistence/prisma/**` is importable only from inside `src/persistence/`. A service injects the abstract repository, never `PrismaService`.
- **`$transaction` is forbidden outside `src/persistence/prisma/`.** Compose writes with `TransactionManager.run()`.
- **A repository port MUST NOT name a Prisma type** — no `Prisma.XWhereInput`, no generated model, no `Decimal`/`JsonValue`. See [docs/persistence.md](docs/persistence.md).
- **Another module's repository is private.** `#src/modules/*/*.repository.js` is off-limits across modules; inject the service that module exports.
- **`ioredis` / `redis`** may only be imported inside `src/infrastructure/cache/`. Elsewhere inject `CacheManagerPort` or `RedisService`.
- **Globally**: `class-validator` and `class-transformer` are forbidden. Use Zod + `createStrictZodDto`.
- The one allowlisted exception is Better Auth's Prisma adapter, scoped to `src/modules/auth/auth.module.ts` and `src/modules/auth/better-auth/better-auth.ts`.
- Inside a module, use **relative imports**. Do not self-reference via `#src/modules/<own-feature>/...`.

---

## 5. File merging — MAY / MUST NOT

Detailed rules and size thresholds live in [docs/file-organization.md](docs/file-organization.md). Summary:

- **MAY** group all DTOs for one controller, a small cohesive port set (`<feature>.ports.ts`), or a feature's cache-key constants into one file.
- **MUST NOT** merge a controller with its DTOs, or a repository port with its adapter.
- **MUST split** when a file exceeds ~400 LOC, a service exceeds ~10 public methods, or the file mixes more than one bounded concern.
- **MUST NOT** create `utils.ts`, `helpers.ts`, `misc.ts`, or any other generic dumping ground. Name files after their actual contents.

---

## 6. Naming conventions — MUST

- Controller: `<feature>.controller.ts`. Class: `{Feature}Controller`.
- Service: `<feature>.service.ts`. Class: `{Feature}Service`. A second service is named after its sub-concern.
- Repository port: `<feature>.repository.ts`. Class: `abstract class {Feature}Repository`.
- Repository adapter: `src/persistence/prisma/<feature>.prisma.repository.ts`. Class: `Prisma{Feature}Repository`.
- Other port: `<feature>.ports.ts` or `<name>.port.ts`. Class: `abstract class {Name}Port`.
- Entity: `entities/{name}.entity.ts`. Value object: `{name}.vo.ts`, class `{Name}VO`.
- DTOs: `dto/{intent}.dto.ts` (or grouped `dto/<feature>.dto.ts`). Class extends `createStrictZodDto(...)`.
- Exception class: `{Feature}Exception` in `<feature>.exception.ts`. Static factories return new instances (see [src/modules/authorization/authorization.exception.ts](src/modules/authorization/authorization.exception.ts)).
- Guards: `guards/{name}.guard.ts`. Decorators: `decorators/{name}.decorator.ts`.
- Unit specs: co-located as `*.spec.ts`, wired with `Test.createTestingModule`.
- Contract tests: `test/<module>.contract-spec.ts`.
- E2E tests: `test/<module>.e2e-spec.ts`.

---

## 7. Config & secrets — MUST

- All runtime env reads MUST be contained in namespaced factories under `src/config/`. Consumers MUST inject the relevant factory with `@Inject(<config>.KEY)` and `ConfigType`; direct `process.env.*` access outside `src/config/` is forbidden.
- Env keys MUST be declared in the relevant Zod schema under `src/config/`. Every factory MUST be registered in `configurations.ts` so validation runs at bootstrap.
- Secrets MUST NOT be committed. `.env.example` and `.env.test.example` are the only env files in source control.

---

## 8. Validation — MUST

- All HTTP request bodies, params, and queries MUST be validated by Zod DTOs that extend `createStrictZodDto`. See [src/modules/authorization/dto/set-permission-override.dto.ts](src/modules/authorization/dto/set-permission-override.dto.ts).
- Strict mode rejects unknown keys. Do not relax it without justification documented in the PR.
- `class-validator` is **forbidden globally** (ESLint-enforced).

---

## 9. Errors & responses — MUST

- Every error crossing a boundary MUST be an `AppException` subclass (see [src/common/exceptions/app-exception.ts](src/common/exceptions/app-exception.ts)). Wrap Prisma/Redis/external-provider failures into the feature's `AppException` subclass **inside the adapter** — a driver error code must never reach a service.
- Every `AppException` subclass MUST use a stable `AppErrorCode` and an i18n `messageKey`. Never expose raw framework or driver errors to the client.
- All HTTP responses MUST flow through the global response interceptor and use the envelope:
  - Success: `{ success: true, message?, data? }`
  - Error: `{ success: false, message, errors?: [{ path, message }] }`
- `@SkipEnvelope()` MAY be used **only** for documented webhook handlers and MUST be tested.
- Catching `AppException` to swallow it is forbidden. Let it propagate to the global filter.

---

## 10. Logging — MUST

- Use the injected Pino logger. `console.*` is forbidden in `src/`.
- Logs MUST be structured (object payloads, not interpolated strings).
- Never log secrets, tokens, passwords, session IDs, or full request bodies that may contain credentials.

---

## 11. Caching — MUST

- All Redis keys MUST use the `hak:` prefix.
- Every cache entry MUST set an explicit TTL. No infinite caches.
- Caches MUST be invalidated on logout, session revocation, role mutation, permission mutation, and any authorization change. Cache MUST NOT override an authoritative deny.
- L1 caches are request-scoped only. L2 is Redis.

---

## 12. Security — MUST

- CSRF: global guard for cookie-bearing POST/PUT/PATCH/DELETE. Exemptions MUST be explicit and documented.
- Rate-limit: global baseline; per-route overrides for sensitive endpoints (auth, registration, password reset).
- Authentication/authorization checks: **fail-closed** on uncertainty. If a permission check throws or returns ambiguous, deny.
- File uploads: validate magic bytes, prevent SSRF in URL fetchers, prevent path traversal in storage drivers.

---

## 13. Testing — MUST

- Every new use case MUST have a co-located unit spec (`*.spec.ts`) that mocks ports.
- Every new controller endpoint MUST have a contract test in `test/<module>.contract-spec.ts` covering the happy path and at least the relevant subset of `400`, `401`, `403`, `404`, `409`.
- New user-facing messages MUST have i18n keys added to **both** `locales/en-US/<module>.json` and `locales/ar-SY/<module>.json`.
- Test environment is fixed: `.env.test`, Postgres on `localhost:5435`, Redis on `localhost:6380`. Never run tests against the dev DB. See [docs/testing.md](docs/testing.md).
- Tests run with `APP_ENV=test`. Seeders are environment-gated.

---

## 14. Feature-addition workflow — MUST follow before scaffolding

For full detail and code snippets, see [docs/adding-a-feature.md](docs/adding-a-feature.md). The numbered steps in that document are authoritative; the summary below MUST match it exactly.

1. **Decide** whether the work is a new module or an extension of an existing one.
2. **Scaffold** with `nest g resource modules/<feature>`, then adjust to this project's conventions (`.js` extensions, Zod DTOs, no barrel).
3. **Declare the repository port** — `<feature>.repository.ts`, an `abstract class` using only your own types. Skip if the feature stores nothing.
4. **Implement the adapter** under `src/persistence/prisma/` and bind it in `persistence.module.ts`.
5. **Write the DTOs** — Zod via `createStrictZodDto`, under `dto/`.
6. **Write the service** — all behaviour, injecting the abstract repository.
7. **Write the exception class** — `<feature>.exception.ts`, one static factory per error case.
8. **Write the controller** — guards, DTO, one service call.
9. **Register the NestJS module** and add it to `app.module.ts`.
10. **Add i18n keys** to all locales for any new user-facing message.
11. **Add tests** — a service spec overriding the port, plus a contract test per endpoint.
12. **Update docs** if architecture or boundaries changed, then **run the Definition of Done** (§16).

If any step is unclear, STOP and ask — do not guess.

---

## 15. Detecting shared / core extraction

Apply the **three-signal rule**. Extract shared code only if **all three** are true:

1. The code is needed by **two or more features**.
2. The code has **no feature-specific domain meaning**.
3. The code is **framework infrastructure or a cross-cutting concern** (logger, database client, validation pipe, request context, security primitives).

If any signal is false, the code stays feature-owned. The destination matters too: `src/common/` for code with no Nest module, `src/infrastructure/` for a module wrapping an external system, `src/persistence/` for the database and nothing else. Examples and false positives in [docs/shared-core-extraction.md](docs/shared-core-extraction.md).

---

## 16. Definition of Done

A change is **done** when all of the following are true:

- [ ] `npm run lint` passes with no new warnings.
- [ ] `npm run build` (or `tsc --noEmit`) passes.
- [ ] `npm test` passes (unit + contract + e2e relevant to the change).
- [ ] No new `eslint-disable` directives on import or layer rules.
- [ ] No new `@ts-ignore` / `@ts-expect-error` to bypass architectural constraints.
- [ ] No Prisma import outside `src/persistence/`, and no repository port exposing a Prisma type.
- [ ] No `$transaction` outside `src/persistence/prisma/`.
- [ ] No new `index.ts` barrel or `*_TOKENS` symbol map.
- [ ] All new user-facing messages have i18n keys in **all** locales.
- [ ] `@SkipEnvelope()` is not used (or, if used, is on a documented webhook with a contract test).
- [ ] No new dependency, or new dependency is justified in the PR description.
- [ ] [ARCHITECTURE.md](ARCHITECTURE.md) and [docs/](docs/README.md) are updated if architecture or boundaries changed.

---

## 17. Anti-bypass — explicit prohibitions

These rules exist because shortcuts have cost the project before. An AI agent MUST NOT:

a. Add `eslint-disable` to an import-restriction rule.
b. Reintroduce `class-validator` or `class-transformer` "for one quick endpoint".
c. Add a second path alias (`@/`, `~/`, etc.). Only `#src/` is allowed.
d. Inject `PrismaService` into a service, controller, or guard "just this once".
e. Use `@SkipEnvelope()` outside a documented webhook.
f. Catch `AppException` to suppress it from the global filter.
g. Add a runtime dependency without explicit approval in the PR.
h. Put a Prisma type in a repository port signature, or let a Prisma error code escape an adapter.
i. Read `process.env` directly outside `src/config/`.
j. Use `console.*` instead of the injected Pino logger.
k. Mock out the database in contract or e2e tests. Use the real test Postgres on port 5435.
l. Skip writing the contract test for a new endpoint.
m. Leave i18n keys missing from one locale.
n. Rename, reorganize, or refactor code that is unrelated to the requested task.

If a rule appears to block legitimate work, STOP and surface the conflict in the PR description. Do not bypass it.
