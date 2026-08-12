# Changelog

All notable changes to harbor-api-kit will be documented here.

This project follows a lightweight changelog style inspired by Keep a Changelog.

## Unreleased

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
