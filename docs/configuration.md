# Configuration

All runtime configuration is defined as namespaced `registerAs(...)` factories
under `src/config/`. Each namespace owns a Zod schema, parses its environment
variables at bootstrap, and returns the typed shape consumed by the application.
Application code must not read `process.env` outside `src/config/`.

`ConfigurationModule` registers `configurations` globally with caching. A
consumer injects only the namespace it needs:

```ts
constructor(
  @Inject(appConfig.KEY)
  private readonly app: ConfigType<typeof appConfig>,
) {}
```

When adding a variable, update the relevant schema and returned object. When
adding a namespace, also export it from `src/config/index.ts` and add its factory
to `src/config/configurations.ts`.

## Environment Files

- `.env.example` is the development template.
- `.env.test.example` is the test template.
- Real `.env`, `.env.test`, and production env files should not be committed.

## Configuration Namespaces

- `app`: name, environment, port, and public URLs.
- `auth`: better-auth URL and secret, session settings, and OAuth providers.
- `database`: PostgreSQL connection URL.
- `redis`: queue/cache URL, key prefix, and default TTL.
- `http`: proxy trust, CORS, redirects, cookies, CSRF, request IDs, docs, and rate limiting.
- `storage`: local or S3-compatible file storage.
- `notification`: Resend sender, API key, and email retry policy.
- `logger`: log level and pretty-printing.
- `i18n`: locale negotiation and defaults.
- `tenant`: tenant resolution strategy, requirement, and header name.

The `POSTGRES_*` variables in the environment templates configure the Docker
PostgreSQL service; application runtime access uses `DATABASE_URL` through the
`database` namespace.

## Bootstrap Configuration

`npm run bootstrap:rbac` uses the normal database configuration and may run in
development, test, staging, or production. It idempotently ensures roles,
permissions, and built-in role-permission assignments. It does not create users,
sessions, demo accounts, or passwords.

`npm run admin:create` is an explicit one-off admin creation operation. It
requires admin input through CLI flags or `ADMIN_*` environment variables. No
admin password is defined in `.env.example`; use one-off secrets from your shell
or deployment platform. First name defaults to `Admin`; last name defaults to
`User`.

## Auth Defaults

Email verification is optional in this starter. The project sends verification
emails, but better-auth is configured with `requireEmailVerification: false` so
new projects can choose when to enforce verification.

## Redis Prefix

The default Redis key prefix is `hak`. Full keys are composed as
`hak:<domain>:<key>`, for example `hak:auth:<session>`.
