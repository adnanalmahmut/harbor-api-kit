# Project rules (core-platform-api)
- Always run in WSL (Linux).
- After changes, run: npm test, npm run lint, npm run build.
- Do not add new dependencies unless necessary and approved.
- Respect existing architecture (modules, config boundaries, response envelope, logging).
- For DB: use Docker Postgres on localhost:5434 and Redis on localhost:6379.
# saas-core-platform - rules.md

Canonical rules for saas-core-platform. Source of truth for boundaries, contracts, and non-negotiables.

## 0) Prime directives

- Follow repo patterns, naming, ports/adapters, folders
- Single source of truth: never clone utilities/types/logic
- Clean Architecture: outer → inner only
- Minimal diffs: no drive-by refactors
- Never bypass eslint import-boundary rules

## 1) Tech stack (pinned)

Node.js (ESM), NestJS+Fastify, Pino, Prisma 7.2.0+PostgreSQL, Redis (ioredis), Zod v4+nestjs-zod, nestjs-i18n, Swagger+Scalar, BullMQ (planned). Pin exact versions; version bumps must update tests/docs.

## 2) TypeScript + imports

- tsconfig: NodeNext, strict, ES2023, `#src/*` alias
- Prefer `#src/...` imports with `.js` extensions
- No alternative aliases or ad-hoc barrel exports

## 3) Clean Architecture + DDD

Layers: Domain (business rules only) → Application (UseCases+Ports) → Infrastructure (Prisma/Redis/providers) → Presentation (controllers/guards)

- Allowed: Presentation→Application→Domain; Infrastructure→Application
- Prohibited in Domain/Application: `@nestjs/*`, fastify, `@prisma/client`, ioredis, i18n libs

## 4) Global API contract

Success: `{ success: true; message?: string; data?: T }`
Error: `{ success: false; message: string }` or with `errors: [{ path, message }]`

- All responses MUST include `success` field
- Never expose framework errors; use i18n keys
- `SKIP_ENVELOPE` only for webhooks (documented+tested)

## 5) Exceptions

- `AppException` base; modules extend it (`AuthException`, etc.)
- Wrap Prisma/Redis/provider failures into AppException
- Keep codes/messages stable for API clients

## 6) Validation: Zod only

Zod v4 everywhere; DTOs extend `createStrictZodDto`. No class-validator.

## 7) Config + secrets

- Env via `env.schema.ts` + `AppConfigService` only
- Never commit secrets; use `.env.example`

## 8) Logging (Pino)

- No `console.*`; structured logs with correlation fields
- Never log secrets/tokens/passwords

## 9) Security

- CSRF: global guard for POST with cookies; explicit exemptions only
- Rate-limit: global baseline; by-IP/by-user/hybrid
- Fail-closed on auth/rbac uncertainty

## 10) Auth module

- BetterAuth behind `AuthProviderPort`
- Sessions: Redis cache + DB source of truth; read-through pattern
- Logout: invalidate Redis immediately
- Single load per request; AuthGuard stores context for RBAC reuse

## 11) Notifications

Resend provider. BullMQ: send via jobs with locale, template id, variables. Retries configured; failures wrapped in AppException.

## 12) RBAC module

Model: Roles, Permissions, RolePermissions, UserRoles, UserPermissions(allow|deny)

- Effective: role perms + user allow - user deny (deny wins)
- `subject:manage` implies all actions
- Identity responses include `roles[]` and `permissions[]`
- Invalidate cache on any RBAC mutation

## 13) RbacGuard

- Roles/Permissions: AND or ANY mode
- Management escalation rule
- Reuse AuthGuard context; declarative decorators only

## 14) Admin APIs

Seed: idempotent, deterministic, environment-gated. APIs: CRUD roles/permissions, assign/remove mappings, user roles (append/remove), user permissions (allow/deny).

## 15) Caching

- L1: request-scoped only; L2: Redis optimization
- Prefix: `scp:`; explicit TTLs
- Invalidate on logout/revoke/role-permission changes
- Cache must never grant access after authoritative deny

## 16) Testing

Cover: Auth, RBAC, Security, Contract, i18n. Tests match bootstrap config; prefer contract-level assertions.

### Test Environment (Mandatory)

- Config: `.env.test` only
- Database: port 5435 (test), never dev DB
- Redis: port 6380 (test)
- Seeding: `APP_ENV=test` for seed

## 17) AI contribution

Format: Goal → Files → Patch-only. No unrelated rewrites; keep diffs minimal.

## 18) Feature development

### Layer separation

Domain→Application→Infrastructure→Presentation. Checklist: port interface, adapter, use case, controller. No layer skipping.

### Testing (mandatory)

- Contract tests (E2E): `test/*.contract-spec.ts`
- Unit tests: `src/**/*.spec.ts`
- Cover: happy path, 400/401/403/404/409

### i18n

Add keys to `locales/{lang}/{module}.json`. Never hardcode strings.

## 19) Test Troubleshooting

| Issue                     | Root Cause                               | Solution                              |
| ------------------------- | ---------------------------------------- | ------------------------------------- |
| 403 after role assignment | `clearRedisCache()` missing `test-api:*` | Add pattern to `test-redis.helper.ts` |
| Migrate resets wrong DB   | `APP_ENV` doesn't override URL           | Set `$env:DATABASE_URL` explicitly    |
| Seed fails                | `.env.test` missing `SEED_*` vars        | Copy from `.env.example`              |

### Test Checklist

1. `.env.test` has all required vars
2. `REDIS_PREFIX` matches `clearRedisCache()` patterns
3. Flush Redis: `docker exec -i core_platform_api_redis_test redis-cli FLUSHALL`

## 20) Lessons Learned

| Date       | Issue                 | Solution                               |
| ---------- | --------------------- | -------------------------------------- |
| 2026-02-01 | RBAC 403              | Add `test-api:*` to cache clear        |
| 2026-02-01 | `fromParts()` order   | Fix `(subject, action)` in 4 files     |
| 2026-02-01 | `jest is not defined` | Import `{ jest } from '@jest/globals'` |
| 2026-02-01 | `jest.fn()` typing    | Use `jest.Mocked<T>`                   |
