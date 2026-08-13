# Changelog

All notable changes to harbor-api-kit will be documented here.

This project follows a lightweight changelog style inspired by Keep a Changelog.

## Unreleased

- **Breaking (internal structure only — no HTTP contract changed):** restructured
  the codebase from the four-layer hexagonal layout to the standard NestJS
  resource layout. Every feature module is now flat — `<feature>.controller.ts`,
  `<feature>.service.ts`, `<feature>.repository.ts`, `dto/`, `entities/` — with
  the role in the file name instead of in a `domain/ application/
  infrastructure/ presentation/` folder tree. One class per use case became
  methods on one service; `*_TOKENS` symbol maps became abstract classes used
  directly as DI tokens; every module `index.ts` barrel was deleted and imports
  now name the file. All 15 contract/e2e suites pass unchanged — the only edits
  under `test/` are import paths.
  - `src/core/` is gone. Its contents split by kind: `src/common/` for
    cross-cutting code with no Nest module (decorators, filters, interceptors,
    validation, security, exceptions, context, types, utils), `src/infrastructure/`
    for the Nest modules wrapping external systems (redis, queue, logger, i18n,
    rate-limit), and `src/persistence/` for the database. `app.bootstrap.ts`
    moved to `src/bootstrap.ts`.
  - The `shared` module was deleted and folded into `src/common/common.module.ts`.
- **New: `src/persistence/` is the only place the application names a database
  library.** Repository ports live beside the service they serve as abstract
  classes using only application-owned types; the Prisma implementations live in
  `src/persistence/prisma/` and are bound in one `@Global()` `PersistenceModule`.
  Replacing Prisma is now: add a sibling adapter folder, edit one `useClass`
  list. No feature module imports Prisma, and ESLint enforces that from both
  directions. Documented in the new `docs/persistence.md`.
  - Added `TransactionManager`, an abstract port over `$transaction`. Repositories
    inside `run()` join the transaction automatically via `AsyncLocalStorage`, so
    a service composes atomic writes without naming the ORM.
  - Added `prisma-error.mapper.ts`; adapters translate `P2025`/`P2002` instead of
    string-comparing codes at the call site.
  - The one accepted exception is Better Auth's `prismaAdapter`, which needs the
    client itself; it is confined to two files by an ESLint allowlist.
- Replaced the ESLint boundary config: eleven per-layer `no-restricted-imports`
  blocks (≈400 lines keyed off `domain/`, `application/` … path globs that stop
  matching once a module is flat) became four rules that match the new structure
  — Prisma confinement, private repositories across modules, Zod-only validation,
  Redis clients confined to `src/infrastructure/cache/`.
- Regrouped the shared directories by **capability** instead of by kind. The
  `common/` (no Nest module) vs `infrastructure/` (has a Nest module) split was
  scattering each capability across two or three folders — the same failure mode
  as the layer folders. Now one capability, one folder:
  - `src/infrastructure/cache/` — was `infrastructure/redis/` plus
    `common/ports/cache-manager.port.ts`, `common/constants/cache.constants.ts`
    and `common/cache/app-cache.service.ts`. `RedisModule` now provides
    `AppCacheService` too, so the capability owns all of its own wiring.
  - `src/infrastructure/rate-limit/` — was two folders and two Nest modules.
    `RateLimiterModule` (bound the port) and `RateLimitModule` (registered the
    interceptors, and imported the first) are now a single `RateLimitModule`;
    nothing else ever imported `RateLimiterModule`, so the split bought nothing.
  - `src/infrastructure/i18n/` gained `i18n.utils.ts`. `constants/locales.ts`
    deliberately stays in `common/` because `src/config/` validates env against
    it, and config must not depend on a capability folder.
  - `common/security/csrf/` → `common/csrf/`; `common/security/`,
    `common/ports/` and `common/cache/` are gone. Max depth under `common/`
    drops from 4 to 3.
- Dead-code sweep. Removed, all with zero references:
  - two unused dependencies — `@scalar/nestjs-api-reference` (Scalar is loaded
    from a CDN `<script>` in `app.docs.ts`, the package was never imported) and
    `@fastify/static`;
  - 62 i18n keys, in both locales. `locales/*/validation.json` is gone entirely;
    `auth.json` keeps only `errors.authentication_required` and the three email
    subjects — the rest served endpoints this app no longer owns, since Better
    Auth answers `/auth/*` and supplies its own messages;
  - `FileRepository.findAll()` plus `FileFilterParams` and the adapter method
    behind them. There is no list-files endpoint, and this was the last place in
    the codebase that constructed a `Prisma.FileWhereInput`;
  - `FileRepository.findById()` from the port — it had no consumer outside the
    adapter, where it survives as a private helper;
  - `StorageDriverPort.exists()` and both driver implementations;
  - `RedisService.setNxEx()` and `RedisService.ttl()`;
  - the unused `login()` and `assignRoleToUser()` test helpers.
- Deleted `infrastructure/redis/redis.keys.ts` — dead (zero importers), and the
  only file that made a shared directory import a feature module. The
  "documented exception" it justified is removed from `ARCHITECTURE.md` and
  `docs/module-boundaries.md`: nothing under `common/`, `config/` or
  `infrastructure/` imports a feature module any more.
- Fixed 13 pre-existing type errors in `effective-permissions.service.spec.ts`.
  `tsc -p tsconfig.json --noEmit` is now clean across `src/` **and** `test/`;
  previously only the build config was.
- While restructuring the files involved: deduplicated `maskEmail`, which was
  copied verbatim into three notify files; `files.urls.spec.ts` now imports the
  real helpers from the new `files.urls.ts` instead of testing re-declared
  copies of them; the two authorization exception classes were merged into one.
  Deleted `LoggerPort` and `CORE_TOKENS`, both of which existed only to keep
  use-case classes framework-agnostic.
- Rewrote the architecture documentation for the new layout: `ARCHITECTURE.md`,
  `AGENTS.md`, `README.md`, and `docs/{persistence,file-organization,adding-a-feature,module-boundaries,shared-core-extraction,testing}.md`.
  `docs/restructure-plan.md` records the plan and the deviations from it.

- **Breaking:** the public user contract is Better Auth's single `name` field.
  `firstName`/`lastName` are gone from the API, the database and the OpenAPI
  document, together with the request normalization, response scrubbing, schema
  rewriting and database hooks that maintained them. `admin:create` now takes
  `--name`.
- **Breaking:** dropped soft delete from the Better Auth tables. The Prisma
  client extension and the `deletedAt` columns on `user`, `session` and
  `account` are removed; user deletion is Better Auth's own flow. `files` keeps
  its soft delete.
- `/auth/*` is now fully owned by Better Auth — validation, error codes,
  response shape, OpenAPI and CSRF. `trustedOrigins` is configured explicitly
  from `WEB_ALLOWED_ORIGINS` instead of relying on the baseURL-only default.
  Documented in `docs/auth-authorization.md`.
- Reworked the authentication emails. Changing an email address now actually
  sends a confirmation: the callback is wired as Better Auth's
  `sendChangeEmailConfirmation` (it was declared under a name the library never
  calls) and the missing `verify-change-email` template was added in both
  locales. Action links are taken verbatim from Better Auth instead of being
  rebuilt by hand, the language is resolved from the request passed to the
  callback rather than from ambient request state, and delivery failures are
  logged and swallowed uniformly so an email can never fail an auth operation.
  Templates, subjects, queueing and retries moved behind `notify`'s new
  `AuthEmailPort`; `auth` only names the event.
- Fixed the Better Auth rate-limit rule for password resets, which targeted
  `/forget-password` — a path that no longer exists in Better Auth 1.6.2. It now
  targets `/request-password-reset`.
- Removed dead code from the auth module: the unused Better Auth error mapper
  and its helpers, 18 unused `AuthException` factories, the `LinkedAccount`
  entity and hydrator, and the unused `AuthCacheKeys.userMinVersion`. Dropped
  the unused `@thallesp/nestjs-better-auth` dependency.

- **Breaking:** removed the duplicated user CRUD endpoints (`GET/POST /users`,
  `GET/PUT /users/:id`). User identity is served by the Better Auth admin plugin
  under `/auth/admin/*`, which already covers listing, creation, reads, updates,
  bans, sessions and password resets, and is permission-checked by the same
  effective-permission service.
- Moved the per-user permission routes (`/users/:id/permissions`,
  `/users/:id/effective-permissions`) from the `users` module to the
  `authorization` module that owns the concept. Paths, payloads and required
  permissions are unchanged; their i18n keys moved from `users.*` to
  `authorization.*`.
- Removing an override that does not exist now returns `404` instead of `500`.
- Removed the `users` module entirely. Its only remaining piece, the user-name
  policy, moved to `auth/domain/user-name.policy.ts` next to the Better Auth
  boundary that is its sole consumer.
- Prepared the project for public open-source release.
- Documented cookie-based authentication and API response conventions.
- Added community health files and security automation policy.
