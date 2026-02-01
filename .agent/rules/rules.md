---
trigger: always_on
---

# saas-core-platform - rules.md

Canonical rules for saas-core-platform (humans + AI). Source of truth for boundaries, contracts, and non-negotiables.

## 0) Prime directives

- Follow the repo: reuse existing patterns, naming, ports/adapters, folders.
- Single source of truth: never clone utilities/types/logic; move + reuse.
- Clean Architecture dependency direction: outer → inner only; never the reverse.
- Minimal diffs: no drive-by refactors; touch the fewest files; scope to the goal.
- Do not bypass eslint import-boundary rules; fix architecture instead.

## 1) Tech stack (pinned)

- Node.js (ESM)
- NestJS + Fastify (pin exact versions in package.json; do not float)
- Pino logger
- Prisma ORM 7.2.0 + PostgreSQL
- Redis (ioredis)
- Zod v4 + nestjs-zod
- nestjs-i18n
- Swagger + Scalar
- BullMQ (planned)
  Rule: any version bump must update tests/docs and preserve NestJS↔Fastify compatibility.

## 2) TypeScript + imports

- Keep current tsconfig behavior (NodeNext, strict, ES2023, `#src/*` alias).
- Prefer `#src/...` imports; keep ESM conventions used in the repo (incl. `.js` where applicable).
- No alternative aliases, no mixed styles, no ad-hoc barrel exports unless the repo already uses them.

## 3) Clean Architecture + DDD boundaries

Layers:

- Domain: business rules only. No NestJS/Prisma/Redis/HTTP/i18n.
- Application: UseCases + Ports + app DTOs. No NestJS/Prisma/Redis/HTTP.
- Infrastructure: Prisma repos, Redis adapters, external providers (BetterAuth/Resend), workers.
- Presentation: controllers/guards/interceptors/filters; HTTP mapping.
  Allowed deps:
- Presentation → Application → Domain
- Infrastructure → Application (+ Domain if needed)
  Prohibited imports in Domain/Application: `@nestjs/*`, fastify, `@prisma/client`, ioredis, i18n libs, provider SDKs.
  Integration rule: external systems are accessed via Application Ports; Infra implements ports.
  Enforcement: `eslint.config.mjs` restrictions are part of the architecture; do not “disable to ship”.

## 4) Global API contract

Success envelope (default, via ResponseInterceptor):
`ApiSuccess<T> = { success: true; message?: string; data?: T }`
Error envelope (default, via GlobalExceptionFilter):

- `{ success: false; message: string }`
- Validation: `{ success: false; message: string; errors: [{ path: string, message: string }] }`
  Rules:
- All responses MUST include `success: true` (for 2xx) or `success: false` (for errors).
- Never expose provider/framework error shapes.
- Validation always uses the standardized `errors[]` (no Zod/raw pipes output).
- `message` should be an i18n key when possible; avoid leaking internal details.
- `SKIP_ENVELOPE` only for strict compatibility cases (e.g., webhooks); must be documented + tested + included in API docs.

## 5) Exceptions: one system only

- `AppException` is the base; each module extends it (e.g., `AuthException extends AppException`).
  Rules:
- Do not throw external exceptions past Infra boundaries.
- Wrap Prisma/Redis/BetterAuth/Resend failures into AppException-derived exceptions.
- Keep exception codes/messages stable; API clients rely on them.

## 6) Validation: Zod only

- Zod v4 everywhere; validating DTOs extend `createStrictZodDto`.
- No class-validator unless an explicit ADR.
- `createStrictZodDto` must exist in exactly one canonical location.

## 7) Config + secrets

- Env access only via `env.schema.ts` + `AppConfigService` (no `process.env` elsewhere).
- Never commit secrets. Keep `.env` local; commit `.env.example` with placeholders.

## 8) Logging (Pino)

- No `console.*`. Logs are structured; include correlation fields when available (requestId/tenantId/userId).
- Never log secrets/tokens/passwords/session cookies; redact sensitive headers.

## 9) Security baselines

- CSRF: global guard for browser-like POST when sensitive cookies exist; exemptions must be explicit + justified + tested.
- Rate-limit: global baseline; future tuning must support by-IP, by-user, and hybrid keys; key strategy must match the auth model.
- Prefer fail-closed behavior on auth/rbac uncertainty.

## 10) Auth module rules

Provider abstraction:

- BetterAuth is behind `AuthProviderPort`; do not couple app logic to BetterAuth internals.
  Sessions: Redis cache + DB/provider source of truth:
- Read-through: Redis hit → cached snapshot; miss → load authoritative → populate Redis.
- Logout: invalidate Redis session cache immediately; authoritative revoke remains effective.
- TTLs must be explicit; cache must never grant access when authoritative state denies.
  One-load-per-request:
- Session/user is loaded once per request. AuthGuard stores context; RBAC reuses it (no duplicate loads).
- If both guards run, the second must read from request context/L1 cache, not re-query.

## 11) Notifications: Resend + BullMQ

- Resend is the provider.
  When BullMQ is enabled:
- Send emails via jobs; payload includes `locale`, template id, variables, and recipient metadata.
- Worker uses same locale + template rendering rules as API; templates are versioned/stable.
- Retries/backoff configured; failures wrapped into AppException-derived errors.

## 12) RBAC module rules

Conceptual model: Roles, Permissions, RolePermissions, UserRoles, UserPermissions(allow|deny).
Effective permissions (single service, deny wins):

1. Role permissions
2. - user allow
3. - user deny
     Output: `subject:action` strings.
     `subject:manage` implies all actions for that subject (apply in computation + guards + responses).
     Frontend payload:

- Identity responses (login, `/auth/me`, and any “current user profile” response) must include:
  - `roles: string[]`
  - `permissions: string[]` (effective)
    Caching: cache roles/permission snapshots when safe, but invalidate on any RBAC mutation; deny must take effect immediately.

## 13) RbacGuard requirements

Must support:

- Roles: AND (all), ANY (at least one)
- Permissions: AND, ANY
- Management escalation rule
  Performance: reuse AuthGuard context; no repeated DB/provider calls.
  Guard metadata must remain declarative (decorators/config), not hardcoded route logic.

## 14) Admin & management APIs (required)

Seed (Prisma):

- Create base roles + permissions + mappings; create test users per role.
  Rules: idempotent, deterministic, environment-gated (never auto-run in prod; require explicit flag).
  APIs (RBAC-protected admin-only):
- Create roles; create permissions.
- Assign/remove permissions to/from roles (preserve existing unless explicitly replacing).
- User roles: add roles (append), remove one role (preserve others), batch-safe.
- User permissions: add allow/deny, remove entries; deny overrides role allow.
- Admin-only endpoint to update full user data.

## 15) Caching policy (safe under load)

- L1: request-scoped in-memory cache allowed for one request only.
- L2: Redis is optimization only; authoritative state can deny.
- Key naming: use a consistent prefix (e.g., `scp:`) and stable identifiers.
- Define TTLs for sessions, roles, permission snapshots.
- Invalidate on logout/revoke, role-permission changes, user-role changes, user-permission changes.
- Cache must never grant access after authoritative deny.

## 16) Testing (must have)

Cover:

- Auth (login/me/logout, Redis hit/miss, logout invalidation)
- RBAC (role perms + user allow/deny, management rule, AND/ANY guard logic)
- Security (CSRF, baseline rate-limit)
- Contract (envelope, SKIP_ENVELOPE, validation shape)
- i18n (locale propagation + message keys)
  Rules:
- Tests must match bootstrap (global prefix/versioning/envelope and docs config).
- Prefer contract-level assertions; avoid brittle internals.

### Dedicated Test Environment (Mandatory)

All tests (E2E/Integration) MUST use the dedicated test infrastructure:

- **Config**: Load configuration ONLY from `.env.test` file.
- **Database**: Use the dedicated test database instance (port 5435), NEVER the development database.
- **Redis**: Use the dedicated test Redis instance (port 6380).
- **Seeding**: Tests MUST run against a seeded database. Ensure `prisma/seed.ts` is executed with `APP_ENV=test` to populate required system roles/permissions.
- **Isolation**: Each test run should handle its own data cleanup; do not rely on seed data from dev.

## 17) AI contribution protocol

Format:

1. Goal (1 line)
2. Files to change (paths)
3. Patch-only code blocks
   Rules:

- No unrelated rewrites.
- No “optional alternatives” unless requested.
- Keep diffs consistent with repo patterns and architecture boundaries.

## 18) Feature development requirements

When creating any new feature or method:

### Layer separation (mandatory)

- **Domain**: Pure business logic only. No framework imports.
- **Application**: Use cases + ports. Define port interfaces here.
- **Infrastructure**: Implement ports (adapters). Wrap external errors in `AppException`.
- **Presentation**: Controllers + guards. Map HTTP ↔ Application DTOs.

Checklist:

- [ ] New port interface in `application/ports/` if external dependency involved
- [ ] Adapter implementation in `infrastructure/`
- [ ] Use case in `application/use-cases/`
- [ ] Controller method in `interfaces/http/`
- [ ] No layer skipping (controller → adapter directly is forbidden)

### Comprehensive testing (mandatory)

Every new feature must include:

1. **Contract tests** (E2E): Test the HTTP contract (status codes, response shape, validation errors)
2. **Unit tests**: Test use case logic in isolation (mock ports)
3. **Edge cases**: Cover error paths, validation failures, unauthorized access

Test file locations:

- `test/*.contract-spec.ts` for E2E/contract tests
- `src/**/*.spec.ts` for unit tests (co-located)

Minimum coverage:

- [ ] Happy path (success scenario)
- [ ] Validation error (400/422)
- [ ] Authentication error (401)
- [ ] Authorization error (403)
- [ ] Not found (404) if applicable
- [ ] Conflict (409) if applicable

### i18n keys (mandatory)

- Add message keys to `locales/{lang}/{module}.json`
- Use `auth.messages.*` for success, `auth.errors.*` for errors
- Never hardcode user-facing strings
