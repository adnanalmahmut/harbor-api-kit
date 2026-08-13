# Adding a feature

This is the **canonical procedure** for adding backend functionality to `harbor-api-kit`. It is the same procedure referenced from [AGENTS.md](../AGENTS.md).

Before starting, read [ARCHITECTURE.md](../ARCHITECTURE.md) and, if the feature stores anything, [persistence.md](persistence.md). If any step is unclear for the task at hand, **STOP and ask** — do not guess.

---

## Step 1 — Decide: new module or extension?

Answer in order:

1. **Does this introduce a new bounded concept** (a new business noun — "Invoice", "Order", "Audit")? → **New module.**
2. **Does it add behaviour to an existing concept** (a new endpoint on `authorization`, a new method on `files`)? → **Extend the existing module.**
3. **Does it span existing modules without owning a new concept**? → Most likely a **new module** that *consumes* the others. Do not bolt it onto one of them.

If still ambiguous after those three, ask before scaffolding.

---

## Step 2 — Scaffold

```bash
npx nest g resource modules/things --no-spec=false
```

That produces the right shape. Then adjust to this project's conventions:

- move `things.controller.ts` / `things.service.ts` / `things.module.ts` to `src/modules/things/` (Nest already nests them correctly if you pass the path above);
- delete the generated `entities/thing.entity.ts` placeholder and write a real one;
- replace the generated DTOs with Zod DTOs (Step 5);
- add `.js` extensions to every relative import — this project is ESM/NodeNext.

Target layout:

```
src/modules/things/
├── things.module.ts
├── things.controller.ts        (+ .spec.ts)
├── things.service.ts           (+ .spec.ts)
├── things.repository.ts        ← only if the feature stores something
├── things.exception.ts
├── dto/
└── entities/
```

No `index.ts`, no `things.tokens.ts`, no layer folders. See [file-organization.md](file-organization.md).

---

## Step 3 — Declare the repository port

Skip this step if the feature stores nothing (as `notify` does).

```ts
// src/modules/things/things.repository.ts
import type { Thing } from './entities/thing.entity.js';

export interface CreateThingProps {
  name: string;
  ownerId: string;
}

export interface ThingFilterParams {
  skip?: number;
  take?: number;
  where?: { ownerId?: string };
}

/**
 * Abstract class rather than an interface so it doubles as the DI token.
 * Implemented in src/persistence/prisma/thing.prisma.repository.ts.
 */
export abstract class ThingRepository {
  abstract create(props: CreateThingProps): Promise<Thing>;
  abstract findById(id: string): Promise<Thing | null>;
  abstract findAll(params: ThingFilterParams): Promise<[Thing[], number]>;
}
```

**Every type in these signatures must be yours.** A `Prisma.ThingWhereInput` here defeats the whole arrangement. Reference: [src/modules/files/files.repository.ts](../src/modules/files/files.repository.ts).

---

## Step 4 — Implement the adapter and bind it

```ts
// src/persistence/prisma/thing.prisma.repository.ts
import { Thing } from '#src/modules/things/entities/thing.entity.js';
import { ThingsException } from '#src/modules/things/things.exception.js';
import {
  ThingRepository,
  type CreateThingProps,
} from '#src/modules/things/things.repository.js';
import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from './prisma-error.mapper.js';
import { PrismaTransactionManager } from './prisma-transaction.manager.js';

@Injectable()
export class PrismaThingRepository extends ThingRepository {
  constructor(private readonly db: PrismaTransactionManager) {
    super();
  }

  /** Transaction-aware: the transactional client while inside `run`. */
  private get prisma() {
    return this.db.client;
  }

  async create(props: CreateThingProps): Promise<Thing> {
    try {
      return this.toEntity(await this.prisma.thing.create({ data: props }));
    } catch (error) {
      if (isUniqueViolation(error)) throw ThingsException.alreadyExists();
      throw ThingsException.databaseError();
    }
  }

  private toEntity(row: { id: string; name: string }): Thing {
    return new Thing(row.id, row.name);
  }
}
```

Then bind it in [src/persistence/persistence.module.ts](../src/persistence/persistence.module.ts) — add to **both** `providers` and `exports`:

```ts
{ provide: ThingRepository, useClass: PrismaThingRepository },
```

`PersistenceModule` is `@Global()`, so `ThingsModule` must **not** list the repository in its own providers.

Read [persistence.md §3](persistence.md#3-the-rules) before writing this file — the seven rules there are what keep the swap cheap.

---

## Step 5 — Write the DTOs

```ts
// src/modules/things/dto/create-thing.dto.ts
import { createStrictZodDto } from '#src/common/validation/strict-zod-dto.js';
import { z } from 'zod';

export const createThingSchema = z.object({
  name: z.string().min(1),
});

export class CreateThingDto extends createStrictZodDto(createThingSchema) {}
```

Strict mode rejects unknown keys — do not relax it. DTOs may be one-per-file or grouped per controller (`dto/things.dto.ts`); see [file-organization.md](file-organization.md).

---

## Step 6 — Write the service

All behaviour lives here, as methods. Inject the abstract repository, never `PrismaService`.

```ts
// src/modules/things/things.service.ts
import { Injectable } from '@nestjs/common';
import { ThingsException } from './things.exception.js';
import { ThingRepository } from './things.repository.js';

@Injectable()
export class ThingsService {
  constructor(private readonly repository: ThingRepository) {}

  async create(props: { name: string; ownerId: string }) {
    return this.repository.create(props);
  }

  async getById(id: string) {
    const thing = await this.repository.findById(id);
    if (!thing) throw ThingsException.notFound(id);
    return thing;
  }
}
```

If the operation writes through more than one repository, inject `TransactionManager` and wrap the writes in `run()` — never `$transaction`:

```ts
await this.transactions.run(async () => {
  const thing = await this.things.create(props);
  await this.audit.record('thing.created', thing.id);
});
```

Reference: [src/modules/files/files.service.ts](../src/modules/files/files.service.ts).

---

## Step 7 — Write the exception class

```ts
// src/modules/things/things.exception.ts
import { AppException } from '#src/common/exceptions/app-exception.js';
import { AppErrorCode } from '#src/common/exceptions/error-definitions.js';

export class ThingsException extends AppException {
  static notFound(id?: string) {
    return new ThingsException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'things.errors.not_found',
      details: id ? { id } : undefined,
    });
  }
}
```

Every factory sets an `AppErrorCode` (which decides the HTTP status) and a `messageKey` that exists in every locale.

Reference: [src/modules/authorization/authorization.exception.ts](../src/modules/authorization/authorization.exception.ts).

---

## Step 8 — Write the controller

Thin: guards, DTO, one service call, return. The global response interceptor adds the envelope.

```ts
// src/modules/things/things.controller.ts
import { ApiResponses } from '#src/common/decorators/api-errors.decorator.js';
import { ResponseMessage } from '#src/common/decorators/response-message.decorator.js';
import { AuthGuard } from '#src/modules/auth/auth.guard.js';
import { Permissions } from '#src/modules/authorization/decorators/permissions.decorator.js';
import { PermissionsGuard } from '#src/modules/authorization/guards/permissions.guard.js';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateThingDto } from './dto/create-thing.dto.js';
import { ThingsService } from './things.service.js';

@ApiTags('Things')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller({ path: 'things', version: '1' })
export class ThingsController {
  constructor(private readonly thingsService: ThingsService) {}

  @Permissions(['thing:create'])
  @ResponseMessage('things.messages.created_success')
  @ApiResponses(THINGS_RESPONSES.create)
  @Post()
  async create(@Body() body: CreateThingDto) {
    return this.thingsService.create(body);
  }
}
```

Reference: [src/modules/authorization/authorization.controller.ts](../src/modules/authorization/authorization.controller.ts).

---

## Step 9 — Register the module

```ts
// src/modules/things/things.module.ts
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { AuthorizationModule } from '#src/modules/authorization/authorization.module.js';
import { Module } from '@nestjs/common';
import { ThingsController } from './things.controller.js';
import { ThingsService } from './things.service.js';

// `ThingRepository` is provided globally by PersistenceModule.
@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [ThingsController],
  providers: [ThingsService],
  exports: [ThingsService], // only if another module consumes it
})
export class ThingsModule {}
```

Then add `ThingsModule` to [src/app.module.ts](../src/app.module.ts).

If the feature introduces a new permission, add it to [permissions.catalog.ts](../src/modules/authorization/permissions.catalog.ts) and grant it to the appropriate roles.

---

## Step 10 — Add i18n keys

For each new user-facing message, add the key to **every** locale:

- `locales/en-US/<feature>.json`
- `locales/ar-SY/<feature>.json`

```json
{
  "messages": { "created_success": "Thing created successfully" },
  "errors": { "not_found": "Thing not found" }
}
```

Keys MUST match the strings in `@ResponseMessage(...)` and in `AppException` `messageKey` arguments. A missing locale fails the Definition of Done.

---

## Step 11 — Add tests

Required:

- **Unit spec** — `things.service.spec.ts`, using `Test.createTestingModule` and overriding the repository port:

  ```ts
  const moduleRef = await Test.createTestingModule({
    providers: [
      ThingsService,
      { provide: ThingRepository, useValue: repositoryMock },
    ],
  }).compile();
  ```

  Override the **port**, never `PrismaService` — a test written this way survives an ORM change untouched.

- **Contract test** — `test/things.contract-spec.ts`. For every new endpoint, the happy path plus the relevant subset of `400`, `401`, `403`, `404`, `409`. Use `test/helpers/`.

Encouraged: an **E2E spec** for flows spanning modules.

The test environment is fixed: `.env.test`, Postgres on `localhost:5435`, Redis on `localhost:6380`. Never mock the database in contract or e2e tests. Details in [testing.md](testing.md).

---

## Step 12 — Update docs and run the Definition of Done

Update docs when the change touches architecture or boundaries:

- a module that deviates from the canonical layout → note it in [ARCHITECTURE.md §9](../ARCHITECTURE.md#9-deliberate-variations);
- a new convention future contributors would otherwise have to infer → document it under `docs/`;
- a new repository → it is already covered by [persistence.md](persistence.md); no doc change needed.

A pure feature addition that follows existing patterns needs no doc changes.

Then run the checklist in [workflow-checklist.md](workflow-checklist.md) and state in the PR description that it passed.

---

## Decision aids

| Pattern | Reference |
|---|---|
| Repository port + adapter | [files.repository.ts](../src/modules/files/files.repository.ts) → [file.prisma.repository.ts](../src/persistence/prisma/file.prisma.repository.ts) |
| Transaction across repositories | [authorization.prisma.repository.ts](../src/persistence/prisma/authorization.prisma.repository.ts) (`replaceUserPermissions`) |
| A second swappable driver | [src/modules/files/storage/](../src/modules/files/storage/) |
| Wrapping a vendor library | [src/modules/auth/better-auth/](../src/modules/auth/better-auth/) |
| Async cross-module work via a queue | [src/modules/notify/queue/](../src/modules/notify/queue/) |
| A feature with no controller | [src/modules/notify/](../src/modules/notify/) |
| Two services in one feature | [src/modules/authorization/](../src/modules/authorization/) |
