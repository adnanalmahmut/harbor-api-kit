# saas-core-platform-api

Enterprise-grade API starter built with NestJS (Fastify adapter). Follows Clean Architecture with strict layer boundaries, centralized configuration, and a security-first design (sessions, CSRF, rate limiting, RBAC, file storage, i18n).

## Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js 22, TypeScript 5.9, NestJS 11, Fastify 5 |
| Database | PostgreSQL (via Prisma 7) |
| Cache / Queue | Redis (ioredis), BullMQ |
| Auth | better-auth (sessions, OAuth: Google/GitHub) |
| Validation | Zod v4 (strict DTOs) |
| i18n | nestjs-i18n (ar-SY, en-US) |
| Logging | Pino (structured, request-scoped context) |
| Email | Resend (via BullMQ async queue) |
| File Storage | S3-compatible, Google Cloud Storage, Local filesystem |
| API Docs | Swagger (OpenAPI) + Scalar UI |
| Testing | Jest + Supertest (unit, contract, e2e) |
| CI | GitHub Actions |

## Implemented Features

- **Authentication** - Session-based auth via better-auth, OAuth (Google, GitHub), email/password with verification, session management (list/revoke/logout-all), geolocation tracking (IP, city, country)
- **RBAC** - Role-based access control with permission inheritance. Roles, permissions, user-level grants (ALLOW/DENY), effective permissions computation with Redis caching (L1 request-scoped + L2 Redis)
- **Users** - Full CRUD, profile management, role/permission assignment, soft deletes
- **File Storage** - Multi-driver upload (S3/R2/Spaces, GCS, Local), magic bytes validation, presigned download URLs, public/private visibility toggle, public token-based access
- **Notifications** - Async email delivery via BullMQ + Resend, retry with exponential backoff, HTML email templates
- **Security** - CSRF double-submit cookies, rate limiting (global + per-route, IP/user/session strategies), application-level security headers, input validation (Zod strict mode), origin/referer allowlists
- **i18n** - Full internationalization (Arabic ar-SY default, English en-US), locale negotiation via header/query, translated error messages and email templates
- **API Documentation** - Auto-generated OpenAPI/Swagger at `/documentation` (Scalar UI), CSRF token injection for interactive testing
- **Health** - `GET /health` with database + Redis connectivity checks
- **Observability** - Pino structured logging with request ID, user ID, locale context injection

## Planned (Not Yet Implemented)

- MFA/TOTP + step-up authentication
- Distributed tracing (OpenTelemetry)
- Prometheus metrics endpoint
- Audit logging (security-sensitive operations)

## Architecture

This project follows **Clean Architecture** with strict layer boundaries enforced via ESLint.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full architectural rules (single source of truth).

### Layer Structure

Each feature module follows this structure:

```
modules/<feature>/
  domain/          # Pure business logic (no framework deps)
  application/     # Use-cases + orchestration
  infrastructure/  # Adapters (Prisma, external providers)
  presentation/    # Controllers, DTOs, guards
```

Cross-cutting concerns live in `core/`:

```
core/
  domain/          # Shared exceptions, types, ports
  application/     # Cache service, logger port
  infrastructure/  # Config, Prisma, Redis, Logger, i18n, Queue
  presentation/    # Filters, guards, interceptors, decorators, docs, validation
```

### Dependency Direction

- `presentation -> application -> domain` (allowed)
- `infrastructure -> application/domain` (implements ports)
- Cross-feature imports: via feature module's public API (index.ts) or NestJS module imports

### Folder Structure

```
src/
  core/
    infrastructure/
      config/        # AppConfigService (centralized, no process.env drift)
      db/prisma/     # PrismaModule + PrismaService
      redis/         # RedisModule + RedisService
      logger/        # Pino setup
      i18n/          # nestjs-i18n setup
      queue/         # BullMQ setup
    domain/          # AppException, types, ports
    presentation/
      constants/     # Metadata keys
      decorators/    # @ResponseMessage, @SkipEnvelope, @ApiErrors
      docs/          # Swagger/Scalar setup
      filters/       # GlobalExceptionFilter
      hooks/         # RequestContextHook (Fastify)
      interceptors/  # RequestIdentity, Response, RateLimit
      security/      # CSRF guard, rate limiting
      setup/         # CORS, bootstrap
      types/         # API response types
      utils/         # i18n helpers
      validation/    # GlobalValidationPipe, Strict Zod DTO helpers
  modules/
    auth/            # Authentication (better-auth, OAuth, sessions)
    users/           # User CRUD, profile, role/permission assignment
    rbac/            # Roles, permissions, grants, guards
    files/           # File upload/download (S3, GCS, Local)
    notify/          # Email notifications (BullMQ + Resend)
    health/          # Health checks
    shared/          # Shared services (cache)
prisma/
  schema.prisma      # Database schema (12 models)
  migrations/        # Migration history
  seed.ts            # Development seed
  seed.production.ts # Production seed (gated)
locales/             # i18n translation files (ar-SY, en-US)
ops/                 # Nginx config, SSL certs
test/                # E2E/contract tests + helpers
```

## API Conventions

### Response Envelope

All responses are wrapped in a consistent envelope:

```json
// Success
{ "success": true, "message": "Translated message", "data": { ... } }

// Error
{ "success": false, "message": "Translated error", "code": "ERROR_CODE", "requestId": "uuid", "errors": [...] }
```

### Versioning

URI-based: `/api/v1/{endpoint}`

### Error Handling

- All exceptions extend `AppException` with i18n message keys
- Validation errors return structured field-level errors
- No stack traces in production responses

## Run Locally

### Prerequisites

- Node.js 22+
- Docker & Docker Compose (for PostgreSQL + Redis)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values. Required: `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`.

### 3. Start infrastructure

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 4. Database setup

```bash
npx prisma migrate dev
npx prisma db seed
```

### 5. Start dev server

```bash
npm run start:dev
```

The API will be available at `http://localhost:5000/api/v1/`.
API documentation at `http://localhost:5000/documentation` (requires `ENABLE_DOCS=true`).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Development mode (watch) |
| `npm run build` | Production build |
| `npm run start:prod` | Run compiled build |
| `npm run lint` | ESLint with auto-fix |
| `npm run format` | Prettier formatting |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E + contract tests (starts Docker services) |
| `npm run test:cov` | Unit tests with coverage |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Create new migration |
| `npm run prisma:seed` | Run development seed |
| `npm run prisma:studio` | Open Prisma Studio |

## Testing

- **Unit tests** (`src/**/*.spec.ts`): Domain logic, use-cases, validators
- **Contract tests** (`test/*.contract-spec.ts`): API contract validation (auth, users, RBAC, files, security)
- **E2E tests** (`test/*.e2e-spec.ts`): Full integration with database and Redis

### Test environment setup

Tests use a separate environment with PostgreSQL on port 5435 and Redis on port 6380.

```bash
# 1. Copy test environment template (if .env.test doesn't exist)
cp .env.test.example .env.test

# 2. Start test infrastructure
docker compose -f docker-compose.test.yml up -d

# 3. Run database migrations for test DB
npx prisma migrate deploy

# 4. Run unit tests (no Docker required)
npm run test

# 5. Run E2E/contract tests (requires Docker services)
npm run test:e2e
```

Note: `npm run test:e2e` automatically runs `test:e2e:prepare` which starts Docker services and runs migrations.

## Configuration

All runtime configuration is centralized through `AppConfigService`. Direct `process.env` reads are forbidden in application code.

Key configuration sections: `app`, `db`, `redis`, `auth`, `cors`, `csrf`, `rateLimit`, `storage`, `logger`, `i18n`, `cookies`, `fastify`.

See `.env.example` for the full list of environment variables with descriptions.

## Production Deployment

```bash
docker compose -f docker-compose.prod.yml up -d
```

The production stack includes: PostgreSQL, Redis, API (multi-stage Docker build), and Nginx reverse proxy with SSL.

Note: `prisma` is included as a production dependency because database migrations run at container startup (`npx prisma migrate deploy`). For multi-replica deployments, consider running migrations in a separate init container.

## Production Seeding

Production seeding is a separate, explicitly gated operation:

```bash
APP_ENV=production ALLOW_PROD_SEED=true npx tsx ./prisma/seed.production.ts
```

## License

Private/internal (adjust as needed).
