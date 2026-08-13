# Persistence

Prisma is confined to one directory. This document is the contract that keeps it there, so that replacing it later is a bounded job rather than a rewrite.

---

## 1. The shape

```
src/persistence/
  persistence.module.ts              @Global() — binds every repository port to its adapter
  transaction.manager.ts             abstract TransactionManager (the public port)
  database.exception.ts              fallback translation of a driver-level failure
  prisma/
    prisma.service.ts                the PrismaClient subclass
    prisma-transaction.manager.ts    $transaction + AsyncLocalStorage
    prisma-error.mapper.ts           P2025 / P2002 / P2003 predicates
    authorization.prisma.repository.ts
    file.prisma.repository.ts
    db-health.prisma.adapter.ts
```

A feature declares **what** it needs from storage; `src/persistence/` decides **how**:

| Lives with the feature | Lives in persistence |
|---|---|
| `src/modules/files/files.repository.ts` — `abstract class FileRepository` | `src/persistence/prisma/file.prisma.repository.ts` — `class PrismaFileRepository extends FileRepository` |

Nothing under `src/modules/**` imports from `src/persistence/prisma/**`. A feature module does not even list its repository in `providers`: `PersistenceModule` is `@Global()`, so the binding is available everywhere.

## 2. Why the adapters are not inside the feature folder

Because it makes the swap a one-file change instead of an audit:

- adding `src/persistence/drizzle/` and editing the `useClass` list in `persistence.module.ts` replaces the whole data layer;
- "does anything outside persistence touch the database?" is one ESLint glob, not a review of every module;
- a feature PR cannot reintroduce the coupling by accident, because the feature folder has no path to Prisma.

The cost is one directory of distance between a service and its SQL. The port — the file you actually read to know what the service can do — stays next to the service.

## 3. The rules

These seven, not the directory layout, are what make the swap cheap.

### Rule 1 — Prisma lives in `src/persistence/**`

`@prisma/client` and `#src/generated/prisma/**` are import-restricted everywhere else, and `#src/persistence/prisma/**` is itself importable only from within `src/persistence/**`. Enforced in [eslint.config.mjs](../eslint.config.mjs).

### Rule 2 — a port never names a Prisma type

Repository ports are **abstract classes** (so they double as DI tokens) whose signatures use only types we declare:

```ts
// files.repository.ts — ours
export interface FileFilterParams {
  skip?: number;
  take?: number;
  where?: { uploadedById?: string; isPublic?: boolean; /* … */ };
}

// NOT this:
// findAll(where: Prisma.FileWhereInput)   ← leaks the ORM into every caller
```

### Rule 3 — entities are ours, rows are not

`entities/*.entity.ts` are plain classes. Adapters map row → entity in a private `toEntity()` and never return a raw row.

### Rule 4 — error codes stop at the adapter

A Prisma error code must be translated before it leaves the repository, because the code decides the HTTP status:

```ts
} catch (error) {
  // The override does not exist — a client error, not a database failure.
  if (isRecordNotFound(error)) {
    throw AuthorizationException.permissionOverrideNotFound(permissionKey);
  }
  throw AuthorizationException.databaseError({ userId, permissionKey });
}
```

Use the predicates in `prisma/prisma-error.mapper.ts` rather than string-comparing `'P2025'` at the call site. Prefer the module's own exception when the failure has domain meaning; `DatabaseException` is the fallback.

### Rule 5 — transactions go through the port

`$transaction` is the single hardest thing to port to another library, so no service ever sees it. `TransactionManager.run()` is the seam:

```ts
await this.transactions.run(async () => {
  const file = await this.files.create(props);
  await this.audit.record('file.created', file.id);
});
```

Repositories inside the callback join the running transaction automatically. The mechanism is `AsyncLocalStorage`: `PrismaTransactionManager.client` returns the transactional client while inside `run`, and the plain client otherwise, so every repository reads `this.db.client` instead of injecting `PrismaService`:

```ts
export class PrismaFileRepository extends FileRepository {
  constructor(private readonly db: PrismaTransactionManager) {
    super();
  }

  /** Transaction-aware: the transactional client while inside `run`. */
  private get prisma() {
    return this.db.client;
  }
}
```

Nesting is safe — an inner `run` joins the outer transaction rather than opening a second one against the same pool.

### Rule 6 — no Prisma-only value types cross the port

`Decimal`, `JsonValue` and `Prisma.InputJsonValue` must be mapped to a `number`, a `string`, or a declared interface. `bigint` is fine: it is a TypeScript primitive, not a Prisma construct.

### Rule 7 — `PrismaService` has exactly one consumer outside persistence

See below.

## 4. The one accepted exception: Better Auth

`betterAuth({ database: prismaAdapter(prisma, …) })` is a hard dependency on the client object and must **not** be wrapped. Better Auth ships its own adapters (Kysely, Drizzle, Mongo), so changing the database means changing that one line in [src/modules/auth/better-auth/better-auth.ts](../src/modules/auth/better-auth/better-auth.ts).

Accordingly:

- `PersistenceModule` exports `PrismaService`;
- the ESLint allowlist admits `#src/persistence/prisma/**` in exactly two files — `src/modules/auth/auth.module.ts` and `src/modules/auth/better-auth/better-auth.ts`;
- any third file that tries to inject `PrismaService` fails lint.

This is also why the swap can never be *zero* work, and saying so plainly is better than pretending the abstraction is total.

## 5. Adding a repository

1. Declare the port beside the service: `src/modules/<feature>/<feature>.repository.ts`, an `abstract class` using only your own types.
2. Implement it: `src/persistence/prisma/<feature>.prisma.repository.ts`, extending the port, injecting `PrismaTransactionManager`.
3. Bind it in `persistence.module.ts` — add to both `providers` (`useClass`) and `exports`.
4. Inject the **port** in the service. Do not add it to the feature module's `providers`.

## 6. Testing

Override the port, never the client:

```ts
const moduleRef = await Test.createTestingModule({
  providers: [
    FilesService,
    { provide: FileRepository, useValue: repositoryMock },
    // …
  ],
}).compile();
```

A unit test written this way survives a change of ORM untouched. Integration coverage comes from `test/*.e2e-spec.ts`, which run against real Postgres and Redis; those tests may use `PrismaService` directly through `test/helpers/` for seeding — test seeding is allowed to be ORM-coupled.

## 7. What a swap actually costs

| Work | Size |
|---|---|
| New adapter folder implementing 3 repository classes + the transaction manager | the bulk of it |
| `useClass` edits in `persistence.module.ts` | one file |
| Better Auth's database adapter | one line |
| Schema/migration tooling (`prisma/`, `prisma.config.ts`, npm scripts, CI step) | replaced wholesale |
| Feature modules, services, controllers, DTOs, unit tests | **untouched** |
| `test/helpers/` seeding utilities | rewritten |
