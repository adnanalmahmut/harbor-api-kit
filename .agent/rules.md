# saas-core-platform-api - Antigravity Rules

## 0) Project Overview

**Purpose**: Enterprise-grade SaaS backend API with authentication, RBAC, and multi-tenancy support.

**Tech Stack**:
| Category | Technology |
|----------|------------|
| Runtime | Node.js ESM (ES2023) |
| Framework | NestJS 11 + Fastify |
| Database | PostgreSQL via Prisma 7 |
| Cache/Sessions | Redis (ioredis) |
| Validation | Zod 4 + nestjs-zod |
| Localization | nestjs-i18n (ar-SY, en-US) |
| Logging | Pino (nestjs-pino) |
| API Docs | Swagger + Scalar |

**Entry Points**: `src/main.ts` → `src/app.bootstrap.ts` → `src/app.module.ts`

---

## 1) Architecture (Clean Architecture)

```
src/
├── core/              # Shared constants, types, exceptions (framework-agnostic)
├── infrastructure/    # Technical adapters (config, db, http, i18n, redis, security)
├── modules/           # Feature modules (auth, users, rbac, health, playground)
├── generated/         # Prisma client (auto-generated)
└── types/             # Global type declarations
```

**Layer Rules**:
| Layer | Can Import | Cannot Import |
|-------|------------|---------------|
| `domain/` | Value objects, entities, ports | NestJS, Prisma, HTTP, i18n |
| `application/` | Domain, ports | Infrastructure, Presentation |
| `infrastructure/` | Domain, Application, External libs | Presentation |
| `presentation/` | Application (use-cases), DTOs | Domain internals |

---

## 2) Module Structure Pattern

Each feature module follows:

```
modules/{feature}/
├── {feature}.module.ts       # NestJS module
├── {feature}.tokens.ts       # DI tokens (e.g., USER_REPOSITORY)
├── application/
│   ├── dtos/                 # Request/Response DTOs (Zod)
│   └── use-cases/            # Business logic
├── domain/
│   ├── entities/             # Domain entities
│   ├── ports/                # Repository interfaces
│   └── value-objects/        # VOs (Email, Password, etc.)
├── infrastructure/
│   ├── persistence/          # Prisma repository implementations
│   └── mappers/              # DB ↔ Domain mappers
└── presentation/
    └── {feature}.controller.ts
```

**Active Modules**: `auth`, `users`, `rbac`, `health`, `playground`

---

## 3) Key Patterns & Examples

### DTOs (Validation)

```typescript
// Use createStrictZodDto (rejects unknown keys)
import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export class LoginDto extends createStrictZodDto(loginSchema) {}
```

### Repository Port (Domain)

```typescript
// src/modules/users/domain/ports/user.repository.port.ts
export interface UserRepositoryPort {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
}
```

### Repository Implementation (Infrastructure)

```typescript
// src/modules/users/infrastructure/persistence/prisma-users.repository.ts
@Injectable()
export class PrismaUsersRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}
  // ... implementation
}
```

### Exceptions

```typescript
// Use AppException with error codes
import { AppException } from '#src/core/exceptions/app-exception.js';

throw AppException.notFound();
throw AppException.unauthorized();
throw new AppException({
  code: AppErrorCode.CONFLICT,
  messageKey: 'errors.email_taken',
});
```

### Response Envelope

All responses wrapped by `ResponseInterceptor`:

```json
{ "message": "optional.i18n.key", "data": { ... } }
```

---

## 4) Environment Variables

Required vars (see `src/infrastructure/config/env.schema.ts`):
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `RESEND_API_KEY` | Email service API key |
| `CORS_TRUSTED_ORIGINS` | Comma-separated origins (required in prod) |

Optional with defaults: `APP_PORT`, `APP_ENV`, `LOG_LEVEL`, `RATE_LIMIT_*`, `CSRF_*`, `I18N_*`

---

## 5) Prisma Schema

**Location**: `prisma/schema.prisma`  
**Output**: `src/generated/prisma`

**Models**: `User`, `Session`, `Role`, `Permission`, `UserRole`, `RolePermission`, `UserPermission`

**Commands**:

- `npm run prisma:generate` - Generate client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:seed` - Seed database

---

## 6) i18n

**Locales**: `src/infrastructure/i18n/locales/{ar-SY,en-US}/`  
**Resolution**: `Accept-Language` header or `lang` query param  
**Default**: `en-US`

---

## 7) Token-Saving Rules (Prime Directive)

- **Minimize tokens**. Prefer surgical changes over refactors.
- **Reference paths + symbols only**. Never restate existing code.
- **Follow existing repo patterns**; do not invent new abstractions.

### Output Protocol

1. Goal (1 line)
2. Files to change (bullets)
3. Patch-only code blocks (no full file dumps unless asked)
4. No tutorials. No repetition.

### Non-negotiables

- ESM: keep `.js` extensions for internal imports.
- Use `#src/...` path aliases.
- Validation: `nestjs-zod` + `createStrictZodDto`.
- Config: no `process.env` in feature code; use `AppConfigService`.

### Data & Infra Boundaries

- Prisma isolation: no `@prisma/client` imports outside `infrastructure/db/` and repositories.
- Domain/Application must not import NestJS/HTTP/Prisma/Redis/i18n.
- Infrastructure implements ports; Presentation maps HTTP to use-cases.

### API Contract

- Responses via `ResponseInterceptor` envelope.
- Errors via `AppException` + global filter.
- User-facing strings = i18n keys.

### "Do not do" (token killers)

- No multi-option proposals unless asked.
- Don't rewrite unrelated files.
- Don't paste large configs/schemas; only diffs/added keys.
