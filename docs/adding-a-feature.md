# Adding a feature

This is the **canonical procedure** for adding backend functionality to `core-platform-api`. The 12 steps below are the same 12 steps referenced from [AGENTS.md §14](../AGENTS.md#14-feature-addition-workflow--must-follow-before-scaffolding). If they ever drift, the architecture-side fix is here.

Before starting, read [ARCHITECTURE.md](../ARCHITECTURE.md) and [AGENTS.md](../AGENTS.md). If any step below is unclear for the task at hand, **STOP and ask** — do not guess.

---

## Step 1 — Decide: new module or extension?

Answer in order:

1. **Does this work introduce a new bounded concept** (a new business noun like "Invoice", "Order", "Audit")? → **New module.**
2. **Does it add behavior to an existing concept** (a new endpoint on `users`, a new use case on `auth`)? → **Extend existing module.**
3. **Does it cross multiple existing modules without owning a new concept** (e.g., a cross-feature reporting view)? → Most likely a **new module** that *consumes* the others via their barrels. Do not bolt it onto an existing module.

If after these three questions the answer is still ambiguous, ask before scaffolding.

---

## Step 2 — Scaffold the folder structure

A new module gets the canonical layout (see [ARCHITECTURE.md §2](../ARCHITECTURE.md#2-canonical-module-layout)):

```
src/modules/<feature>/
├── index.ts
├── <feature>.module.ts
├── <feature>.tokens.ts
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── ports/
│   └── exceptions/
├── application/
│   ├── use-cases/
│   ├── exceptions/
│   └── mappers/
├── infrastructure/
│   └── persistence/
└── presentation/
    └── http/
        └── dtos/
```

Extending an existing module means adding files into the right layer subfolder, **not** introducing a new top-level folder.

If you need a layer subfolder that doesn't exist yet (e.g., the first guard for a module), create it under the appropriate layer with a meaningful name (`presentation/http/guards/`).

---

## Step 3 — Author the domain

Domain code is pure TypeScript. No NestJS, no Prisma, no Redis, no i18n libs, no class-validator.

- **Entities** — `domain/entities/{name}.entity.ts`, exporting a class. Constructors are explicit; mutation is method-based.
- **Value objects** — `domain/value-objects/{name}.vo.ts`. Use a static `create(value)` factory that throws on invalid input.
- **Ports** — `domain/ports/{name}.port.ts`, exporting an interface. Repositories, external providers, and any I/O the application layer needs are declared here. Example: [src/modules/users/domain/ports/user.repository.port.ts](../src/modules/users/domain/ports/user.repository.port.ts).
- **Domain exceptions** — `domain/exceptions/`. Use sparingly; most errors live at the application layer.

Cohesion rule: a small set of related ports MAY live in one file (`<feature>.ports.ts`). See [file-organization.md](file-organization.md).

---

## Step 4 — Author the application

Application code orchestrates use cases against ports. It MUST NOT import Prisma, NestJS decorators, Redis, i18n, infrastructure, or presentation.

### Use cases

One use case per file (preferred default), or grouped slices when cohesive (≤ 6 use cases per slice, ≤ 400 LOC, single bounded concern). Both styles are valid; see [file-organization.md](file-organization.md).

```ts
// src/modules/<feature>/application/use-cases/create-thing.use-case.ts
import type { ThingRepositoryPort } from '#src/modules/<feature>/domain/ports/thing.repository.port.js';
// ...relative imports inside the same module
import { ThingsException } from '../exceptions/things.exception.js';

export interface CreateThingCommand {
  // explicit input shape — never accept the controller DTO directly
}

export class CreateThingUseCase {
  constructor(private readonly repo: ThingRepositoryPort) {}

  async execute(cmd: CreateThingCommand): Promise<Thing> {
    // 1. validate domain invariants via VOs
    // 2. check repository for conflicts
    // 3. construct entity
    // 4. persist via the port
  }
}
```

Reference: [src/modules/users/application/use-cases/create-user.use-case.ts](../src/modules/users/application/use-cases/create-user.use-case.ts).

### Application exceptions

`<feature>.exception.ts` extends `AppException` with static factories per error case. Each factory MUST set an `AppErrorCode` and a `messageKey` pointing to a locale file.

```ts
// src/modules/<feature>/application/exceptions/<feature>.exception.ts
import { AppErrorCode, AppException } from '#src/core/domain/index.js';

export class ThingsException extends AppException {
  static notFound(id?: string) {
    return new ThingsException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'things.errors.thing_not_found',
      details: id ? { id } : undefined,
    });
  }
}
```

Reference: [src/modules/users/application/exceptions/users.exception.ts](../src/modules/users/application/exceptions/users.exception.ts).

### Mappers

`application/mappers/{name}-response.mapper.ts` translates a domain entity to a response shape consumed by the controller. Pure functions; no I/O.

---

## Step 5 — Author the infrastructure

Infrastructure adapters implement domain ports. They MAY import Prisma, Redis, and external SDKs. They MUST NOT import `presentation/`.

```ts
// src/modules/<feature>/infrastructure/persistence/prisma-thing.repository.ts
import type { ThingRepositoryPort } from '#src/modules/<feature>/domain/ports/thing.repository.port.js';
import { PrismaService } from '#src/core/index.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaThingRepository implements ThingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}
  // implement port methods
}
```

Prisma↔domain translation lives in `infrastructure/mappers/`, **not** in the repository itself when the mapping has any complexity.

External provider adapters (e.g., a Resend email sender, a better-auth wrapper) live in their own subfolder under `infrastructure/`. They MUST wrap third-party errors into a feature-specific `AppException`.

---

## Step 6 — Author the presentation

Controllers are thin. They:

1. Accept a Zod DTO.
2. Apply guards (`@UseGuards(AuthGuard, RbacGuard)`) and decorators (`@Permissions([...])`, `@Roles([...])`).
3. Call exactly one use case.
4. Optionally pass the result through a response mapper.
5. Return the value (the global response interceptor wraps the envelope).

### DTOs

```ts
// src/modules/<feature>/presentation/http/dtos/create-thing.dto.ts
import { createStrictZodDto } from '#src/core/index.js';
import { z } from 'zod';

const createThingSchema = z.object({
  name: z.string().min(1),
});

export class CreateThingDto extends createStrictZodDto(createThingSchema) {}
```

Strict mode rejects unknown keys. Do not relax it.

DTOs may be one-per-file (preferred) or grouped per controller (`<feature>.dto.ts`). See [file-organization.md](file-organization.md).

### Controllers

Reference: [src/modules/users/presentation/http/users.controller.ts](../src/modules/users/presentation/http/users.controller.ts).

`@ResponseMessage('<module>.messages.<key>')` on a method sets the success envelope's `message`. `@ApiResponses(...)` documents Swagger examples.

---

## Step 7 — Register the NestJS module

```ts
// src/modules/<feature>/<feature>.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '#src/core/index.js';
import { THINGS_TOKENS } from './things.tokens.js';
import { CreateThingUseCase } from './application/use-cases/create-thing.use-case.js';
import { PrismaThingRepository } from './infrastructure/persistence/prisma-thing.repository.js';
import { ThingsController } from './presentation/http/things.controller.js';
import type { ThingRepositoryPort } from './domain/ports/thing.repository.port.js';

@Module({
  imports: [PrismaModule],
  controllers: [ThingsController],
  providers: [
    { provide: THINGS_TOKENS.THING_REPOSITORY, useClass: PrismaThingRepository },
    {
      provide: CreateThingUseCase,
      useFactory: (repo: ThingRepositoryPort) => new CreateThingUseCase(repo),
      inject: [THINGS_TOKENS.THING_REPOSITORY],
    },
  ],
  exports: [
    THINGS_TOKENS.THING_REPOSITORY,
    CreateThingUseCase, // only if other modules consume it
  ],
})
export class ThingsModule {}
```

Tokens file:

```ts
// src/modules/<feature>/<feature>.tokens.ts
export const THINGS_TOKENS = {
  THING_REPOSITORY: Symbol('THINGS_REPOSITORY'),
} as const;
```

Reference: [src/modules/users/users.module.ts](../src/modules/users/users.module.ts) and [src/modules/users/users.tokens.ts](../src/modules/users/users.tokens.ts).

Register the new module in [src/app.module.ts](../src/app.module.ts) so NestJS picks it up.

---

## Step 8 — Expose the public API (`index.ts`)

```ts
// src/modules/<feature>/index.ts
export * from './things.module.js';
export * from './things.tokens.js';
// Add explicit re-exports for any port, application service, response DTO,
// guard, decorator, or exception type that another module legitimately needs.
```

**Rules** (from [ARCHITECTURE.md §6](../ARCHITECTURE.md#6-public-api-boundary)):

- The barrel is the **only** entry point another module may import from.
- When another module needs a symbol that isn't exported yet, the fix is to extend this `index.ts` — not to deep-import.
- Do not re-export internal mappers, infrastructure adapters, or anything not intended for cross-module consumption.

For richer barrel patterns (re-exporting via layer-level indices) see [src/modules/auth/index.ts](../src/modules/auth/index.ts).

---

## Step 9 — Add i18n keys

For each new user-facing message (success message or error), add the key to **every** locale:

- `locales/en-US/<feature>.json`
- `locales/ar-SY/<feature>.json`

Convention:

```json
{
  "messages": {
    "thing_created_success": "Thing created successfully"
  },
  "errors": {
    "thing_not_found": "Thing not found"
  }
}
```

The keys MUST match the strings used in `@ResponseMessage(...)` and in `AppException` `messageKey` arguments. Missing a locale fails the Definition of Done.

---

## Step 10 — Add tests

Required:

- **Unit specs** — one per use case, co-located as `*.spec.ts`. Mock the port; assert behavior, not implementation.
- **Contract tests** — `test/<feature>.contract-spec.ts`. For every new endpoint, cover the happy path plus the relevant subset of `400`, `401`, `403`, `404`, `409`. Use the helpers in `test/helpers/`.

Optional but encouraged:

- **E2E specs** — `test/<feature>.e2e-spec.ts` for flows that span multiple modules (e.g., auth → RBAC → users).

Test environment is fixed: `.env.test`, Postgres on `localhost:5435`, Redis on `localhost:6380`. Never mock the database in contract or e2e tests. Full details in [testing.md](testing.md).

---

## Step 11 — Update docs

Update documentation when the change touches architecture or boundaries:

- New module → add it (and any documented exception status) to [ARCHITECTURE.md §10](../ARCHITECTURE.md#10-documented-exceptions-partial-modules) if it deviates from the canonical layout.
- New cross-module dependency → add a row to [ARCHITECTURE.md §5.1](../ARCHITECTURE.md#51-current-cross-module-dependency-map-migration-target).
- New convention or pattern that future agents would otherwise have to infer → document it under `docs/`.
- New shared helper in `core/` → ensure it passes the three-signal test ([shared-core-extraction.md](shared-core-extraction.md)) and reference it from the relevant doc.

A pure feature addition that follows the existing patterns does not require doc changes.

---

## Step 12 — Run the Definition of Done

Before opening the PR, run through the checklist in [workflow-checklist.md](workflow-checklist.md). The PR description MUST state that the checklist passed.

---

## Decision aids

- Repository pattern? See [src/modules/users/infrastructure/persistence/prisma-user.repository.ts](../src/modules/users/infrastructure/persistence/prisma-user.repository.ts).
- External provider adapter? See [src/modules/auth/infrastructure/](../src/modules/auth/infrastructure/) (`better-auth/`).
- Multi-driver infrastructure (e.g., S3 / GCS / Local)? See [src/modules/files/infrastructure/](../src/modules/files/infrastructure/).
- Async cross-module work via a job queue? See [src/modules/notify/infrastructure/](../src/modules/notify/infrastructure/) (`bullmq/`, `resend/`).
