---
name: saas-core-platform-api-rules
description: Enforce the canonical rules for saas-core-platform-api across reviews, changes, debugging, and test fixes (Clean Architecture, API envelope, security, Auth/RBAC, caching, testing).
---

# saas-core-platform-api-rules

Instructions for the AI agent:

- Treat this skill as the source of truth for boundaries, contracts, and non-negotiables in saas-core-platform-api.
- Fail closed on auth/rbac/security uncertainty.
- Keep diffs minimal, patch-only, no unrelated rewrites.
- Never bypass eslint import-boundary rules.

Canonical rules (non-negotiable):

- Prime directives:
  - Follow repo patterns, naming, ports/adapters, folders
  - Single source of truth - never clone utilities/types/logic
  - Clean Architecture dependency direction only (outer -> inner)
  - Minimal diffs - no drive-by refactors
  - Never bypass eslint import-boundary rules
- Tech stack (pinned): Node.js (ESM), NestJS + Fastify, Pino, Prisma + PostgreSQL, Redis (ioredis), Zod v4 + nestjs-zod, nestjs-i18n, Swagger + Scalar, BullMQ (planned)
  - Pin exact versions; version bumps must update tests/docs
- TypeScript + imports:
  - tsconfig: NodeNext, strict, ES2023, `#src/*`
  - Prefer `#src/...` imports with `.js` extensions
  - No alternative aliases or ad-hoc barrel exports
- Clean Architecture + DDD layers:
  - Domain -> Application -> Infrastructure -> Presentation
  - Allowed: Presentation -> Application -> Domain; Infrastructure -> Application
  - Prohibited in Domain/Application: `@nestjs/*`, fastify, `@prisma/client`, ioredis, i18n libs
- Global API contract (envelope):
  - Success: `{ success: true; message?: string; data?: T }`
  - Error: `{ success: false; message: string }`
  - Validation: `{ success: false; message: string; errors: Array<{ path: string; message: string }> }`
  - All responses MUST include `success`
  - Never expose raw framework/provider errors; use stable i18n keys/messages
  - `SKIP_ENVELOPE` only for webhooks (documented + tested)
- Exceptions:
  - `AppException` base; modules extend it (`AuthException`, etc.)
  - Wrap Prisma/Redis/provider failures into `AppException`
  - Keep codes/messages stable; never leak secrets/tokens/cookies/passwords/stacks
- Validation: Zod only
  - Zod v4 everywhere; DTOs extend `createStrictZodDto`
  - No class-validator
- Config + secrets:
  - Env via `env.schema.ts` + `AppConfigService` only
  - Never commit secrets; keep `.env.example` updated
  - Do not read `process.env` outside config layer
- Logging (Pino):
  - No `console.*`
  - Structured logs with correlation fields
  - Never log secrets/tokens/passwords/cookies/csrf/session ids
- Security:
  - CSRF: global guard for unsafe methods when cookies are used; explicit exemptions only (documented + tested)
  - Rate-limit: global baseline; per-route stricter when needed
  - Fail closed on auth/rbac uncertainty
- Auth module:
  - BetterAuth behind `AuthProviderPort`
  - Sessions: Redis cache + DB source of truth (read-through)
  - Logout: invalidate Redis immediately
  - Single load per request; AuthGuard stores context for RBAC reuse
- Notifications:
  - Resend provider; with BullMQ send via jobs with locale, template id, variables
  - Retries configured; failures wrapped in AppException
- RBAC module:
  - Roles, Permissions, RolePermissions, UserRoles, UserPermissions(allow|deny)
  - Effective: role perms + user allow - user deny (deny wins)
  - `subject:manage` implies all actions
  - Invalidate cache on any RBAC mutation
- RbacGuard:
  - Support AND/ANY mode for roles/permissions
  - Management escalation rule
  - Reuse AuthGuard context; declarative decorators only
- Admin APIs:
  - Seed: idempotent, deterministic, environment-gated
  - CRUD roles/permissions + assign/remove mappings + user roles append/remove + user perms allow/deny
  - Invalidate cache on any RBAC change
- Caching:
  - L1 request-scoped only; L2 Redis optimization
  - Prefix `scp:`; explicit TTLs
  - Invalidate on logout/revoke/role-permission changes
  - Cache must never grant access after authoritative deny
- Testing:
  - Cover Auth, RBAC, Security, Contract, i18n
  - Contract tests (E2E): `test/*.contract-spec.ts`
  - Unit tests: `src/**/*.spec.ts`
  - Cover: 400/401/403/404/409 + happy path
  - Test env mandatory: `.env.test` only; Postgres 5435; Redis 6380; seed gated by `APP_ENV=test`
- AI contribution:
  - Format: Goal -> Files -> Patch-only
  - No unrelated rewrites; keep diffs minimal

## Usage

Use this skill when you:

- Review PRs/diffs, propose refactors, or debug production/test failures in saas-core-platform-api.
- Add/modify endpoints, guards, interceptors, filters, exceptions, caching, auth/rbac, or i18n/validation/config/logging.
- Fix contract/e2e tests or bootstrap issues.

When responding with a review/recommendation, keep this exact structure:

1. Goal (1-2 lines)
2. Files touched (explicit list)
3. Findings (Blocker, High, Medium, Low)
4. Required changes (patch-only, minimal diffs)
5. Tests to run (exact commands)

## Steps

1. Identify the task intent and list the files/modules/layers affected.
2. Enforce architecture boundaries: verify dependency direction and prohibited imports in Domain/Application.
3. Enforce the API envelope: every response includes `success`, stable i18n messages, and correct validation `errors[]` mapping.
4. Enforce exception hygiene: wrap provider/DB/cache errors into module exceptions extending `AppException` without leaking sensitive data.
5. Enforce security controls: auth + rbac fail-closed, CSRF guard behavior with explicit exemptions only, and rate-limit rules.
6. Enforce caching correctness: `scp:` prefix, TTLs, and invalidation on logout/revoke and all RBAC mutations; never allow cache to overrule authoritative deny.
7. Ensure tests and environment correctness: `.env.test` only, correct ports, deterministic seed gating, then provide exact test commands.
