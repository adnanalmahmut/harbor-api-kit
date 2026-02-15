---
trigger: always_on
---

````md
# PROJECT_CONTEXT.md

Project: saas-core-platform

## 1) What this repository is

saas-core-platform is a reusable backend foundation for SaaS products. It standardizes core platform capabilities:

- Authentication and session lifecycle (BetterAuth behind a port)
- Authorization (RBAC with roles + permissions + user allow/deny overrides)
- Security controls (CSRF, rate limiting, fail-closed behavior)
- Consistent API contract (success envelope) and i18n-driven messages
- Centralized config, logging, and exception handling
- Deterministic, environment-gated seeding for admin/RBAC bootstrap

Primary goal: ship secure, predictable platform features with strict architectural boundaries, minimal drift, and contract-level tests.

## 2) Non-negotiables (source of truth)

The canonical source of truth is `rules.md`. Any guidance here must not conflict with it.
Prime directives:

- Follow repo patterns, naming, ports/adapters, folders
- Single source of truth - do not duplicate utilities/types/logic
- Clean Architecture dependency direction: outer -> inner only
- Minimal diffs - no drive-by refactors
- Never bypass eslint import-boundary rules

## 3) Tech stack (pinned)

Runtime and framework:

- Node.js (ESM), TypeScript (NodeNext, strict, ES2023)
- NestJS + Fastify

Core libraries:

- Prisma 7.2.0 + PostgreSQL
- Redis (ioredis)
- Zod v4 + nestjs-zod (Zod only, no class-validator)
- nestjs-i18n
- Pino (nestjs-pino)
- Swagger + Scalar
- BullMQ planned for async notifications (email jobs)

Pin exact versions. Any bump must update tests and docs.

## 4) Architectural model (Clean Architecture + DDD)

Layers:

- Domain: business rules only (no NestJS, Prisma, Redis, i18n, Fastify)
- Application: use cases + ports (interfaces), pure orchestration
- Infrastructure: Prisma/Redis/providers/adapters implementing ports
- Presentation: controllers/guards/interceptors, HTTP concerns

Allowed dependency direction:

- Presentation -> Application -> Domain
- Infrastructure -> Application (implements ports)
  Prohibited in Domain/Application:
- @nestjs/\*
- fastify
- @prisma/client
- ioredis
- i18n libraries

Rule of thumb:

- If a file touches HTTP request/response, it belongs to Presentation.
- If a file touches Prisma/Redis/external providers, it belongs to Infrastructure.
- If a file describes the business policy without infrastructure, it belongs to Domain/Application.

## 5) Import conventions

- Prefer `#src/...` imports with `.js` extensions (ESM)
- No alternative aliases
- No ad-hoc barrel exports

## 6) Global API contract

Every HTTP response must include a `success` boolean, except explicitly documented and tested `SKIP_ENVELOPE` use cases.

Success:

```ts
{ success: true, message?: string, data?: T }
```
````

Error:

```ts
{ success: false, message: string }
```

or validation errors:

```ts
{ success: false, message: string, errors: [{ path, message }] }
```

Notes:

- Never expose framework errors to clients.
- Messages must be i18n keys resolved by the system.
- `SKIP_ENVELOPE` is only permitted for explicitly documented and tested exceptions.

## 7) i18n rules

- Never hardcode user-facing strings in controllers/services.
- Add keys to `locales/{lang}/{module}.json`.
- Response messages should use stable keys.
- Fallback behavior must be deterministic.

## 8) Exceptions policy

- Use `AppException` as the base exception type.
- Each module defines its own exception type extending `AppException` (e.g., `AuthException`, `RbacException`).
- Wrap all provider failures (Prisma/Redis/external APIs) into AppException derivatives.
- Keep error codes/messages stable for API clients.

## 9) Config and secrets

- Read env only through `env.schema.ts` and `AppConfigService`.
- Do not use `process.env` outside the config boundary.
- Never commit secrets. Keep `.env.example` updated.

## 10) Logging (Pino)

- No `console.*`
- Use structured logs with correlation fields (request id, user id when available).
- Never log secrets/tokens/passwords/cookies/csrf/session identifiers.
- Prefer counts and masked identifiers over raw values.

## 11) Security model

CSRF:

- Global guard for unsafe methods when cookies are used.
- Exemptions must be explicit, documented, and tested.

Rate limiting:

- Global baseline rate limit.
- Support by-IP, by-user, or hybrid.
- Tighten limits for sensitive endpoints (login/register/reset, etc.).

Fail-closed:

- On auth/RBAC uncertainty, deny access (401/403) rather than allowing.

## 12) Auth module rules

- BetterAuth must be behind `AuthProviderPort`.
- Session caching:

  - Redis is an optimization (L2) and DB is the source of truth.
  - Read-through pattern - fetch from DB, populate Redis.

- Logout/revoke must invalidate Redis immediately.
- Single load per request:

  - AuthGuard loads session once and stores context for RBAC reuse.

## 13) RBAC model and guard rules

Data model:

- Roles, Permissions, RolePermissions, UserRoles
- UserPermissions with allow/deny (deny wins)

Effective permissions:

- effective = (role permissions + user allow) - user deny
- `subject:manage` implies all actions for that subject

Responses:

- Identity responses include `roles[]` and `permissions[]`.

Caching:

- Cache results in Redis with prefix `scp:`.
- Explicit TTLs.
- Invalidate cache on any RBAC mutation.
- Cache must never grant access after authoritative deny.

RbacGuard:

- Supports AND/ANY mode for roles and permissions.
- Uses declarative decorators only.
- Reuses AuthGuard context (no re-fetch).

## 14) Notifications (email)

- Provider: Resend
- With BullMQ: enqueue jobs with locale, template id, variables
- Retries configured and failures wrapped in AppException
- Templates are repo-based (stored as files), not DB-based.

## 15) Testing requirements

Mandatory coverage areas:

- Auth, RBAC, Security, Contract, i18n

Test types:

- Contract/E2E: `test/*.contract-spec.ts` (preferred for platform rules)
- Unit: `src/**/*.spec.ts`

Must cover:

- happy path and 400/401/403/404/409
- CSRF and rate-limit edge cases
- cache invalidation correctness (logout, RBAC mutations)
- i18n behavior (no leaked framework errors)

Test environment (mandatory):

- Use `.env.test` only
- PostgreSQL port 5435 for tests, never dev DB
- Redis port 6380 for tests
- Seeding is allowed only when `APP_ENV=test`

## 16) Contribution rules (AI and humans)

Change format:

- Goal -> Files -> Patch-only
- Keep diffs minimal
- Never introduce duplicated utilities/types/logic
- Do not bypass eslint import-boundary rules
- Update tests/docs when behavior changes

## 17) Quick navigation (typical structure)

High-level directories (may vary by module but must follow the pattern):

- `src/modules/<feature>/domain`
- `src/modules/<feature>/application` (use cases + ports)
- `src/modules/<feature>/infrastructure` (Prisma/Redis/providers/adapters)
- `src/modules/<feature>/presentation` (controllers/guards/dtos)

Shared infrastructure:

- `src/infrastructure/...` (HTTP interceptors/filters, config module, redis client, logging, security guards)

Tests:

- `test/*.contract-spec.ts`
- `src/**/*.spec.ts`

## 18) Operational expectations

- Deterministic behavior across environments
- Strict API contract and stable error keys
- Secure-by-default posture
- Redis used only as optimization, never as authoritative allow
- Any exception to these rules must be explicitly documented and tested

```

```
