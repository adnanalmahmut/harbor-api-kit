# Restructure plan: Nest-standard layout with a swappable persistence layer

**Status: executed.** Kept as the record of what was decided and why. The living
documentation is [ARCHITECTURE.md](../ARCHITECTURE.md) and
[persistence.md](persistence.md) — when they disagree with this file, they win.

**Goal:** replace the four-layer hexagonal layout (`domain/ → application/ → infrastructure/ | presentation/`) with the standard NestJS resource layout, *without* losing the ability to replace Prisma later.

## Deviations from the plan as written

1. **P6 (core → `common/` + `infrastructure/`) ran second, not last.** The plan
   sequenced it last to avoid repo-wide import churn colliding with the feature
   phases. Since everything landed in one pass rather than seven PRs, doing it
   early meant each feature was rewritten once against its final import paths
   instead of twice.
2. **No temporary `PrismaService` re-export.** P0 planned a shim from the old
   `core` barrel; with only eight consumers it was cheaper to update them
   directly than to add an indirection and remove it again in P7.
3. **`PersistenceModule` exports `PrismaService`.** Not planned, but required:
   Better Auth's `prismaAdapter` needs the client. The boundary is preserved
   statically instead — the ESLint allowlist admits it in exactly two files.
   See [persistence.md §4](persistence.md#4-the-one-accepted-exception-better-auth).
4. **The `shared` module was deleted**, folded into `src/common/common.module.ts`.
   It named a location rather than a concern.
5. **Three small improvements were taken while the files were already open**,
   each noted here because the plan forbids drive-by refactors:
   `maskEmail` was triplicated across three notify files and is now one file;
   `files.urls.spec.ts` tested re-declared copies of the helpers and now imports
   the real ones (extracted to `files.urls.ts`); the two authorization exception
   classes became one.
6. **`LoggerPort` and `CORE_TOKENS` were deleted.** Both existed to keep
   use-case classes framework-agnostic — a constraint the target style drops.
7. **The 13 pre-existing type errors** in `effective-permissions.service.spec.ts`
   (noted in §8 as a known condition) were fixed as part of P4, as planned.
   `tsc -p tsconfig.json --noEmit` is now clean across `src/` and `test/`.

---

## 1. What the example module establishes

`src/modules/example` is the untouched output of `nest g resource example`:

```
example/
  example.module.ts          @Module({ controllers, providers })
  example.controller.ts      HTTP only — one method per route, delegates everything
  example.controller.spec.ts Test.createTestingModule({controllers, providers})
  example.service.ts         @Injectable() — all the logic, one class
  example.service.spec.ts    Test.createTestingModule({providers})
  dto/create-example.dto.ts  input contract
  dto/update-example.dto.ts  PartialType(CreateExampleDto)
  entities/example.entity.ts the shape the module works with
```

Five properties define this style, and they are the target:

1. **Flat.** One folder per feature, no layer sub-folders. The file name says the role (`.controller`, `.service`, `.dto`, `.entity`).
2. **One service.** Behaviour lives in `<feature>.service.ts` as methods, not in one class per use case.
3. **DI by class.** `constructor(private readonly exampleService: ExampleService)`. No token constants, no `useFactory`, no manual `new`.
4. **No barrels.** No `index.ts`. Imports name the file they come from.
5. **Co-located specs**, wired through `Test.createTestingModule`, not by hand-constructing classes.

## 2. The gap the scaffold leaves

The scaffold has no persistence seam at all — the expectation is `constructor(private prisma: PrismaService)` inside the service. Adopting that literally would weld Prisma into every service and make the requirement "swap Prisma later without pain" impossible.

So the target is **the example layout plus exactly one addition**: a repository seam. Everything else in the current architecture (ports for storage/email/cache, use-case classes, value objects, barrels, token symbols, layer folders) is dropped unless §9 lists it.

## 3. Target layout

### Per feature

```
src/modules/<feature>/
  <feature>.module.ts
  <feature>.controller.ts          (+ .spec.ts)
  <feature>.service.ts             (+ .spec.ts)
  <feature>.repository.ts          ← abstract class: the port AND the DI token
  <feature>.exception.ts
  dto/
    create-<feature>.dto.ts        createStrictZodDto — unchanged
    <feature>-response.dto.ts
  entities/
    <feature>.entity.ts            plain TS, owned by us, never a Prisma type
  guards/ decorators/              only when the feature actually has them
```

### Global

```
src/
  common/          decorators, filters, interceptors, validation, security,
                   exceptions, types, utils — cross-cutting code, no Nest module
  config/          unchanged
  infrastructure/  redis/ queue/ logger/ i18n/ rate-limit/ context/
                   — each stays a Nest module, these are wiring not features
  persistence/
    persistence.module.ts          @Global() — binds EVERY repository port to its adapter
    prisma/
      prisma.service.ts            moved from core/infrastructure/db/prisma/
      <feature>.prisma.repository.ts
  modules/<feature>/
```

### Why the adapters sit in `src/persistence/` and not in the feature folder

Because that is the whole point of the exercise. With one central tree:

- swapping the ORM = add `src/persistence/drizzle/`, change the `useClass` list in **one** file, delete the old folder;
- "does anything outside persistence touch the database?" is answered by one ESLint glob, not by auditing every module;
- a feature module never names Prisma, so a feature PR can never re-introduce the coupling by accident.

The cost is that a feature's data access is one directory away from the feature. That is the deliberate trade: the port (`<feature>.repository.ts`) stays with the feature and is what you read; the adapter is an implementation detail you rarely open.

## 4. The Prisma-swap contract

These seven rules are what actually make the swap cheap. The layout alone does not.

| # | Rule | Enforced by |
|---|------|-------------|
| 1 | Only files under `src/persistence/**` may import `#src/generated/prisma/**`, `@prisma/client`, or inject `PrismaService`. | ESLint `no-restricted-imports` |
| 2 | Repository ports are **abstract classes** whose signatures use only our own types — never `Prisma.XWhereInput`, `Prisma.XCreateInput`, or a generated model type. | review + rule 1 |
| 3 | Entities under `entities/` are ours. Adapters map row → entity in a private `toEntity()`. Never return a raw row. | review |
| 4 | Prisma error codes never leave the adapter. `P2025 → NotFound`, `P2002 → Conflict`, everything else → the module's `AppException`. Today this already happens in `prisma-authorization.repository.ts`; it becomes mandatory. | review |
| 5 | **Transactions go through a port.** `src/persistence/transaction.manager.ts` exposes `abstract run<T>(fn: () => Promise<T>): Promise<T>`; the Prisma adapter implements it with `$transaction` + AsyncLocalStorage so repositories inside the callback join it. Services never see `$transaction`. | new file in P0 |
| 6 | No Prisma-only value types cross the port: `Decimal`, `JsonValue`, `Prisma.InputJsonValue`. Map to `number`/`string`/a declared interface. (`bigint` is fine — it is a TS primitive.) | review |
| 7 | `PrismaService` is removed from the `#src/core` public barrel. The only legitimate consumers outside `persistence/` are `test/helpers/*` (test seeding may stay ORM-coupled) and Better Auth (§ below). | P0 + ESLint |

Rule 5 is the one that gets skipped and then costs the most. Multi-repository writes are the single hardest thing to port to another ORM; introduce the port in P0 while there are almost no transactions to migrate.

### The one bounded exception: Better Auth

`betterAuth({ database: prismaAdapter(prisma, …) })` is a hard Prisma dependency and must not be abstracted — Better Auth ships its own adapters (Kysely, Drizzle, Mongo) and swapping the database means swapping that adapter, one line, in `src/modules/auth/better-auth/auth.ts`. Document it as a known, accepted coupling rather than trying to wrap it. It is also the reason the swap can never be *zero* work, and stating that up front is honest.

## 5. Phases

Each phase is one PR, green CI, no behaviour change. The `test/` suite (11 contract/e2e specs hitting real HTTP + Postgres + Redis) is the safety net for the entire migration — **do not touch `test/` during a restructuring phase**. If a contract spec needs editing to make a phase pass, the phase changed behaviour and is wrong.

| Phase | Scope | Size |
|---|---|---|
| **P0 — the seam** | Create `src/persistence/` (`persistence.module.ts`, `prisma/prisma.service.ts`, `transaction.manager.ts`). Move `PrismaService`, keep a re-export from `#src/core` temporarily so nothing breaks. Add `src/persistence/**` to the ESLint Prisma-isolation ignore list. No feature touched. | small |
| **P1 — health** | 13 files / 116 lines. Flatten to `health.module.ts`, `health.controller.ts`, `health.service.ts`, `health.ports.ts`. `prisma-db-health.adapter.ts` → `src/persistence/prisma/`. Proves the pattern end to end on the cheapest module. | small |
| **P2 — notify** | 13 files / 931 lines. No database access, so no persistence work. `AuthEmailService` becomes a plain `@Injectable()` and the 20-line `useFactory` in `notify.module.ts` disappears — the clearest early win. BullMQ/Resend adapters → `providers/`. | medium |
| **P3 — files** | 24 files / 1961 lines. 8 use-case classes → `files.service.ts`. Watch the size: split into `files.service.ts` + `file-streaming.service.ts` if it passes ~400 lines. `IStorageDriver` stays a port (§9). `prisma-file.repository.ts` → `src/persistence/prisma/`. Drop `FILES_TOKENS`. | large |
| **P4 — authorization** | 33 files / 1580 lines. 5 use cases + `EffectivePermissionsService` → `authorization.service.ts`. Merge the two exception files into one. Keep `permissions.catalog.ts` and `permission-calculator.ts` as plain files at the feature root (§9). `PermissionsGuard`/`@Permissions` → `guards/`, `decorators/`. | large |
| **P5 — auth** | 24 files / 1141 lines. Highest risk, do last. `infrastructure/better-auth/` → `better-auth/` moved wholesale, contents untouched. Collapse `auth.bindings.ts` + `auth.exports.ts` + `auth.tokens.ts` into `auth.module.ts`. `AuthGuard` stays exported — every other module imports it. | large |
| **P6 — core** | 69 files / 3194 lines. `core/presentation/*` → `src/common/*`; `core/infrastructure/{redis,queue,logger,i18n,rate-limit,context}` → `src/infrastructure/*`; `core/domain/*` → `src/common/{exceptions,types,utils,constants}`. Mechanical, but touches nearly every import in the repo — land it alone. | large |
| **P7 — cleanup** | Delete all module `index.ts` barrels and the temporary `PrismaService` re-export. Rewrite ESLint (§6). Rewrite docs (§7). | medium |

Phases P1–P5 are independent of each other; only P0 must come first and P6/P7 last.

## 6. ESLint changes

The current config is ~400 lines of per-layer `no-restricted-imports`. Almost all of it keys off path globs (`src/modules/**/domain/**`, `**/application/**`) that stop matching the moment a module is flattened — so it does not fight the migration, it just silently stops protecting anything. Two consequences to handle deliberately:

- **P0 must add** `src/persistence/**` to the `ignores` of the "Default Prisma Isolation" block, or every new adapter fails lint.
- **P7 must replace** `crossModuleDeepRestricted`, which stops matching after flattening. Cross-module imports become plain file imports; the replacement rule is narrower and better: *nothing outside `src/persistence/**` may import `**/*.repository.ts` adapters or `#src/persistence/prisma/**`*.

The end state is roughly four rules instead of eleven layer configs:

1. Prisma/`@prisma/client`/generated types → `src/persistence/**` only.
2. `src/persistence/prisma/**` importable only from `src/persistence/**`.
3. No `class-validator` / `class-transformer` (unchanged — Zod DTOs).
4. Controllers may not import another module's repository port.

The "this layer must be framework-agnostic (no `@nestjs/*`)" rules are dropped: services become `@Injectable()`, which is the whole point of the target style.

## 7. Docs to rewrite in P7

| File | Action |
|---|---|
| `ARCHITECTURE.md` | Rewrite §layers around controller/service/repository; keep §7 file-size policy. |
| `docs/file-organization.md` | Full rewrite — every naming row and every example path changes. |
| `docs/adding-a-feature.md` | Full rewrite — becomes "`nest g resource`, then add the repository port". |
| `docs/module-boundaries.md` | Rewrite — boundaries are now module folders + the persistence rule, not layers. |
| `docs/shared-core-extraction.md` | Rewrite against `common/` + `infrastructure/`. |
| `AGENTS.md`, `README.md`, `docs/testing.md`, `docs/api-conventions.md` | Repoint paths and examples. |
| `docs/persistence.md` | **New** — §4 of this document becomes the permanent rule set. |

## 8. Testing impact

- Unit specs move next to the service/controller and are rewritten to the scaffold's shape: `Test.createTestingModule({ providers: [FeatureService, { provide: FeatureRepository, useValue: mock }] })`. The abstract repository class is now the standard mocking seam, replacing the hand-built mock objects in `__test-support__/repository-mocks.ts`.
- The existing use-case specs map one-to-one onto service-method specs; no coverage is lost.
- `test/*.contract-spec.ts` and `test/*.e2e-spec.ts` stay byte-identical through P0–P6. They are the proof each phase changed nothing.
- Known pre-existing condition: `effective-permissions.service.spec.ts` has 13 type errors under `tsconfig.json` (not under `tsconfig.build.json`, so CI is green). P4 rewrites that file — fix them there rather than in a separate PR.

## 9. What we deliberately keep

Flattening is not the goal; removing ceremony is. These survive because they carry real weight:

- **Ports that model a genuine choice of implementation**: `IStorageDriver` (local/S3), `EmailProviderPort` (Resend/queue), `AuthEmailPort`, the health ports, and the repository ports. A port with exactly one possible implementation forever is ceremony; these are not that.
- **Real domain logic as plain files at the feature root**: `permissions.catalog.ts`, `permission-calculator.ts`, `permission-key.vo.ts`. They are pure, unit-tested, and framework-free. They lose the `domain/` folder, not their existence.
- **Zod DTOs via `createStrictZodDto`**, the `@ApiResponses`/`@ResponseMessage` decorators, the response envelope, and the i18n message keys. The public API contract does not move.
- **`AppException` + `error-definitions.ts`** and the per-module `<feature>.exception.ts`.

What actually disappears: layer folders, `index.ts` barrels, `*_TOKENS` symbol constants, one-class-per-use-case, and the manual `useFactory` wiring that exists only because use cases were kept framework-agnostic (`files.module.ts` alone is ~90 lines of it).

## 10. Risks

- **P6 is a repo-wide import churn.** Land it in its own PR with no other change, and rely on `tsc` + the e2e suite rather than review to catch mistakes.
- **Service files growing into god-objects.** `files` and `auth` are the candidates. The ~400-line / one-sentence-purpose rule from `ARCHITECTURE.md §7` still applies — split into a second service rather than tolerating a 900-line one.
- **Losing the DENY-override guarantees in P4.** `authorization.e2e-spec.ts` and `authorization-admin.e2e-spec.ts` cover this; they must stay untouched and green.
- **Better Auth in P5.** Move `better-auth/` as a directory rename only. Do not "clean it up" in the same PR.
- **Doing P0 late.** If feature phases land before the persistence seam exists, services will be written against `PrismaService` and P0 turns from a small PR into a second migration.
