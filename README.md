````md
# saas-core-platform-api

Enterprise-style API starter built with NestJS (Fastify adapter). Designed for government/enterprise-grade patterns: strict config boundaries, clean layering, and security-first roadmap (sessions, CSRF, rate limiting, RBAC, refresh rotation).

## Goals

- Provide a credible, reviewable backend starter that looks and behaves like a real institutional codebase.
- Keep runtime configuration centralized (no process.env drift).
- Keep persistence swappable (DB ports + ORM adapters).
- Build the security perimeter early (Redis locks, CSRF, rate limiting) before heavy auth/RBAC flows.

## Tech stack

- Runtime: Node.js, TypeScript, NestJS, Fastify
- DB: PostgreSQL (via Prisma)
- i18n: nestjs-i18n
- Logging: Pino (structured logs)
- Tests: Jest + Supertest (e2e)

## Current status

Implemented (Phase 0 + Phase 1):

- App bootstrap and module structure
- Health endpoint: `GET /health`
- Global exception handling + response envelope
- i18n setup and message keys
- Prisma integration (module/service)
- Minimal DB Ports (Application layer) + Prisma Adapters (Infra layer)
  - Users repository
  - Sessions repository
  - RBAC repositories (roles/permissions)
- e2e test coverage for `/health`

Planned next (high-level roadmap):

- Phase 2: Redis core + CSRF double-submit + rate limiting
- Phase 3: RBAC engine (registry bootstrap, bitset, cache, guards)
- Phase 4: Auth core (sessions, refresh rotation, reuse detection)
- Phase 5: Action tokens + email queue + templates
- Phase 6: MFA (TOTP) + step-up
- Phase 7: Social login (provider-swappable)
- Phase 8: Observability + audit + hardening tests

## Architecture overview

This repository follows a Ports/Adapters approach:

- Application layer defines repository ports (interfaces) that represent what the app needs.
- Infrastructure layer implements these ports using Prisma.
- Prisma types must not leak outside infra; mapping is done in adapters.

This keeps the domain/application logic stable even if the ORM changes later.

## Folder structure (simplified)

- `src/core/`
  - `config/` - centralized configuration (AppConfigService)
  - `exceptions/` - typed errors and error definitions
  - `filters/` - global exception filter
  - `i18n/` - locales and i18n setup
  - `db/prisma/` - PrismaModule + PrismaService
- `src/modules/`
  - `users/`
    - `domain/` - entities, ports
    - `infra/` - prisma repositories + mappers
  - `sessions/` (or shared under infra if currently minimal)
  - `health/` - /health endpoint

## API conventions

- Responses are wrapped in a consistent envelope (success and error).
- Errors use message keys (i18n) and stable error codes.
- Logging is structured and intended for production observability.

## Run locally

### 1) Install

```bash
npm install
```
````

### 2) Configure environment

- Copy `.env.example` to `.env`
- Ensure `DATABASE_URL` is set (Postgres connection string)

### 3) Database

```bash
npx prisma migrate dev
npx prisma db seed
```

### 4) Start dev server

```bash
npm run start:dev
```

## Scripts (typical)

- `npm run start:dev` - dev mode
- `npm run build` - production build
- `npm run start:prod` - run compiled build
- `npm run test:e2e` - e2e tests

(Exact scripts depend on `package.json`.)

## Testing

### e2e

- `/health` is used as a stable, dependency-light endpoint for e2e validation.

```bash
npm run test:e2e
```

## Config boundaries (important)

- Runtime code must not read `process.env` directly.
- Runtime configuration must go through `AppConfigService` (and config modules).
- Prisma CLI and seed are allowed to read `DATABASE_URL` directly for tooling only.

This rule is intentional to prevent hidden config drift and to keep production configuration auditable.

## Prisma notes

- `prisma/schema.prisma` defines minimal core tables (users, sessions, roles, permissions).
- Migrations represent the database history.
- Seed creates initial roles/permissions for local development.

## Roadmap details (phases)

### Phase 2 - Security perimeter

- Redis module + key prefixes
- CSRF double-submit:
  - cookie: `__Host-csrf`
  - header: `x-csrf-token`
  - enforced on POST/PUT/PATCH/DELETE
  - origin/referer allowlist as an extra guard

- Rate limiting:
  - global defaults + per-route overrides
  - key strategy configurable (ip/userId/sid)

### Phase 3 - RBAC engine

- Permission registry bootstrap from DB at startup (strict mode)
- Effective permissions builder (roles -> bitset) + caching (L1 + Redis)
- Guards/decorators like `@RequirePerm('users:read')`
- Invalidation strategy on RBAC changes

### Phase 4 - Auth core

- Register/login with session-backed refresh tokens
- Refresh rotation on every refresh
- Redis lock to prevent refresh race
- Reuse detection (family revoke + logout)
- Session management endpoints (list/revoke/logout-all)

## License

Private/internal (adjust as needed).

```

```
