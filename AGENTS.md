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

- Every feature module MUST follow the canonical four-layer layout: `domain/`, `application/`, `infrastructure/`, `presentation/`.
- Every feature module MUST have `<feature>.module.ts`, `<feature>.tokens.ts` (when it owns DI tokens), and a root `index.ts`.
- Documented exceptions (`notify`, `health`, `shared`) are listed in [ARCHITECTURE.md §10](ARCHITECTURE.md#10-documented-exceptions-partial-modules). Do not invent new exceptions without updating that section.
- For step-by-step scaffolding see [docs/adding-a-feature.md](docs/adding-a-feature.md).

---

## 3. Public API boundary — MUST (ESLint-enforced)

- Every module MUST expose its public API through its root `index.ts`.
- Cross-module imports MUST target `#src/modules/<feature>/index.js`. Importing past the barrel — e.g., `#src/modules/users/application/use-cases/create-user.use-case.js` — is **forbidden and ESLint-enforced** (CI will fail).
- **NestJS module classes** are the one exception: they are NOT in the barrel (to avoid ESM circular initialization). Consuming `.module.ts` files import the module class directly from `#src/modules/<feature>/<feature>.module.js`.
- When a needed symbol is not yet exported by a target module's barrel, the correct fix is to **add the export to that module's `index.ts`** — never to deep-import.
- Inside a module, use **relative imports** for in-feature references. Do not self-reference via `#src/modules/<own-feature>/...`.
- The single documented deep-import exception is [src/core/infrastructure/redis/redis.keys.ts](src/core/infrastructure/redis/redis.keys.ts) — see [ARCHITECTURE.md §4.2](ARCHITECTURE.md#42-cross-module-public-api-enforcement-eslint-enforced).

---

## 4. Layer boundaries — MUST / MUST NOT

ESLint enforces these in [eslint.config.mjs](eslint.config.mjs). An agent MUST NOT add `eslint-disable` to bypass them.

- **Domain** MUST NOT import `@nestjs/*`, `@prisma/client`, `ioredis`, `nestjs-i18n`, `class-validator`, `class-transformer`, generated Prisma types, `application/`, `infrastructure/`, `presentation/`, or request context internals.
- **Application** MUST NOT import Prisma, NestJS, Redis, i18n libs, `infrastructure/`, or `presentation/`. Application receives infrastructure dependencies only as constructor-injected port interfaces from `domain/ports/`.
- **Presentation** MUST NOT import Prisma, Redis, or non-config/non-logger infrastructure paths.
- **Infrastructure** MUST NOT import `presentation/`.
- **Globally**: `class-validator` and `class-transformer` are forbidden. Use Zod + `createStrictZodDto`.

---

## 5. File merging — MAY / MUST NOT

Detailed rules and size thresholds live in [docs/file-organization.md](docs/file-organization.md). Summary:

- **MAY** merge cohesive use cases, cohesive request/response DTOs per controller, cohesive port sets, or feature cache-key constants into one file.
- **MUST NOT** merge code from different architectural layers, a controller with its DTOs, or a repository adapter with its mapper.
- **MUST split** when a file exceeds ~400 LOC, contains > ~6 exported use cases or DTOs, or mixes more than one bounded concern.
- **MUST NOT** create `utils.ts`, `helpers.ts`, `misc.ts`, or any other generic dumping ground. Name files after their actual contents.

---

## 6. Naming conventions — MUST

- Use cases: `{verb}-{noun}.use-case.ts`. Class: `{Verb}{Noun}UseCase`.
- Grouped use cases: `<feature>.<slice>.use-cases.ts` (e.g., `auth.password.use-cases.ts`).
- Repositories: `prisma-{entity}.repository.ts`. Class: `Prisma{Entity}Repository`.
- Port interfaces: `{name}.port.ts` in `domain/ports/`. Interface: `{Name}Port`.
- Value objects: `{name}.vo.ts` in `domain/value-objects/`. Class: `{Name}VO`.
- DTOs: `{intent}.dto.ts` (or grouped `<feature>.dto.ts`). Class extends `createStrictZodDto(...)`.
- Exception class: `{Module}Exception` in `<module>/<layer>/exceptions/{module}.exception.ts`. Static factories return new instances (see [src/modules/users/application/exceptions/users.exception.ts](src/modules/users/application/exceptions/users.exception.ts)).
- Tokens: `{MODULE}_TOKENS` constant of `Symbol`-keyed entries in `<feature>.tokens.ts`.
- Unit specs: co-located as `*.spec.ts`.
- Contract tests: `test/<module>.contract-spec.ts`.
- E2E tests: `test/<module>.e2e-spec.ts`.

---

## 7. Config & secrets — MUST

- All env reads MUST go through `AppConfigService` (`#src/core/infrastructure/config/`). Direct `process.env.*` access outside that folder is forbidden.
- Env keys MUST be declared in the env schema (`env.schema.ts`). Schema validation MUST run at bootstrap.
- Secrets MUST NOT be committed. `.env.example` and `.env.test.example` are the only env files in source control.

---

## 8. Validation — MUST

- All HTTP request bodies, params, and queries MUST be validated by Zod DTOs that extend `createStrictZodDto`. See [src/modules/users/presentation/http/dtos/create-user.dto.ts](src/modules/users/presentation/http/dtos/create-user.dto.ts).
- Strict mode rejects unknown keys. Do not relax it without justification documented in the PR.
- `class-validator` is **forbidden globally** (ESLint-enforced).

---

## 9. Errors & responses — MUST

- All errors thrown from application or domain MUST be `AppException` subclasses (see [src/core/domain/exceptions/app-exception.ts](src/core/domain/exceptions/app-exception.ts)). Wrap Prisma/Redis/external-provider failures into a feature-specific `AppException` subclass at the infrastructure boundary.
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
- Caches MUST be invalidated on logout, session revocation, role mutation, permission mutation, and any RBAC change. Cache MUST NOT override an authoritative deny.
- L1 caches are request-scoped only. L2 is Redis.

---

## 12. Security — MUST

- CSRF: global guard for cookie-bearing POST/PUT/PATCH/DELETE. Exemptions MUST be explicit and documented.
- Rate-limit: global baseline; per-route overrides for sensitive endpoints (auth, registration, password reset).
- Auth/RBAC checks: **fail-closed** on uncertainty. If a permission check throws or returns ambiguous, deny.
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
2. **Scaffold** the folder structure for the module (or the layer subfolders that are new).
3. **Author the domain** — entities, value objects, port interfaces, domain exceptions.
4. **Author the application** — use cases, application exceptions, response mappers.
5. **Author the infrastructure** — repository adapters, provider adapters.
6. **Author the presentation** — controller, Zod DTOs, guards, decorators.
7. **Register the NestJS module** — providers wired via tokens, controllers listed, exports declared.
8. **Expose the public API** — extend the root `index.ts` with the new public surface.
9. **Add i18n keys** to all locales for any new user-facing message.
10. **Add tests** — unit specs for use cases, contract tests for endpoints.
11. **Update docs** if architecture or boundaries changed.
12. **Run the Definition of Done** checklist (§16).

If any step is unclear, STOP and ask — do not guess.

---

## 15. Detecting shared / core extraction

Apply the **three-signal rule**. Extract code to `core/` only if **all three** are true:

1. The code is needed by **two or more features**.
2. The code has **no feature-specific domain meaning**.
3. The code is **framework infrastructure or a cross-cutting concern** (logger, persistence client, validation pipe, request context, security primitives).

If any signal is false, the code stays feature-owned. Examples and false positives in [docs/shared-core-extraction.md](docs/shared-core-extraction.md).

---

## 16. Definition of Done

A change is **done** when all of the following are true:

- [ ] `npm run lint` passes with no new warnings.
- [ ] `npm run build` (or `tsc --noEmit`) passes.
- [ ] `npm test` passes (unit + contract + e2e relevant to the change).
- [ ] No new `eslint-disable` directives on import or layer rules.
- [ ] No new `@ts-ignore` / `@ts-expect-error` to bypass architectural constraints.
- [ ] All new cross-module imports go through the target module's `index.ts`.
- [ ] All new user-facing messages have i18n keys in **all** locales.
- [ ] `@SkipEnvelope()` is not used (or, if used, is on a documented webhook with a contract test).
- [ ] No new dependency, or new dependency is justified in the PR description.
- [ ] [ARCHITECTURE.md](ARCHITECTURE.md) and [docs/](docs/README.md) are updated if architecture or boundaries changed.

---

## 17. Anti-bypass — explicit prohibitions

These rules exist because shortcuts have cost the project before. An AI agent MUST NOT:

a. Add `eslint-disable` to a layer-boundary or import-restriction rule.
b. Reintroduce `class-validator` or `class-transformer` "for one quick endpoint".
c. Add a second path alias (`@/`, `~/`, etc.). Only `#src/` is allowed.
d. Create a "temporary" deep cross-module import. There is no such thing.
e. Use `@SkipEnvelope()` outside a documented webhook.
f. Catch `AppException` to suppress it from the global filter.
g. Add a runtime dependency without explicit approval in the PR.
h. Merge architectural layers into one file (e.g., putting a use case and a repository in the same file).
i. Read `process.env` directly outside `core/infrastructure/config/`.
j. Use `console.*` instead of the injected Pino logger.
k. Mock out the database in contract or e2e tests. Use the real test Postgres on port 5435.
l. Skip writing the contract test for a new endpoint.
m. Leave i18n keys missing from one locale.
n. Rename, reorganize, or refactor code that is unrelated to the requested task.

If a rule appears to block legitimate work, STOP and surface the conflict in the PR description. Do not bypass it.
