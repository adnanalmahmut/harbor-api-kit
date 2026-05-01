# Configuration

All runtime configuration goes through `AppConfigService`. Application code must
not read `process.env` directly outside the config infrastructure.

## Environment Files

- `.env.example` is the development template.
- `.env.test.example` is the test template.
- Real `.env`, `.env.test`, and production env files should not be committed.

## Main Groups

- App: name, environment, port, public URLs.
- Database: PostgreSQL connection and Docker service settings.
- Redis: queue/cache URL, key prefix, and default TTL.
- Auth: better-auth URL, secret, session cookie names, session lifetime.
- CSRF: double-submit cookie/header settings.
- CORS and redirects: allowed origins for browsers and callback URLs.
- Storage: local, S3-compatible, or GCS file storage.
- Email: Resend sender and API key.
- i18n: locale negotiation and defaults.

## Bootstrap Configuration

`npm run bootstrap:rbac` uses the normal database configuration and may run in
development, test, staging, or production. It does not create users.

`npm run admin:create` requires admin input through CLI flags or `ADMIN_*`
environment variables. No admin password is defined in `.env.example`; use
one-off secrets from your shell or deployment platform.

## Auth Defaults

Email verification is optional in this starter. The project sends verification
emails, but better-auth is configured with `requireEmailVerification: false` so
new projects can choose when to enforce verification.

## Redis Prefix

The default Redis key prefix is `hak`. Full keys are composed as
`hak:<domain>:<key>`, for example `hak:auth:<session>`.
