# Admin and RBAC Bootstrap

This project separates permission bootstrapping from user creation.

## RBAC Bootstrap

Run the RBAC bootstrap after migrations in any environment:

```bash
npm run bootstrap:rbac
```

It is safe and idempotent. It ensures:

- System roles from `DEFAULT_ROLES`.
- Canonical permissions from `PERMISSION_CATALOG`.
- Built-in role-permission assignments for the admin and user roles.

It does not create users, demo accounts, sessions, or passwords.

`npx prisma db seed` points to the same RBAC bootstrap for Prisma workflows.

## Admin CLI

Create or ensure an administrator through the explicit one-off CLI:

```bash
npm run admin:create -- \
  --email admin@example.com \
  --password replace-with-a-long-random-password
```

The CLI accepts these inputs as flags or environment variables:

| Flag           | Environment variable | Required |
| -------------- | -------------------- | -------- |
| `--email`      | `ADMIN_EMAIL`        | Yes      |
| `--password`   | `ADMIN_PASSWORD`     | Yes      |
| `--first-name` | `ADMIN_FIRST_NAME`   | No       |
| `--last-name`  | `ADMIN_LAST_NAME`    | No       |
| `--locale`     | `ADMIN_LOCALE`       | No       |
| `--image`      | `ADMIN_IMAGE`        | No       |

The password has no default and must be at least 12 characters long. First name
defaults to `Admin`; last name defaults to `User`.

If the user already exists, the CLI updates the profile fields and ensures the
admin role. It does not reset the existing password.

## Production Usage

In production, run migrations first, then RBAC bootstrap, then create the first
admin user as a one-off operation:

```bash
APP_ENV=production npm run bootstrap:rbac
APP_ENV=production npm run admin:create -- \
  --email admin@example.com \
  --password replace-with-a-long-random-password
```

Provide `DATABASE_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET` through the
deployment environment. Do not commit production `.env` files.

Run `bootstrap:rbac` and `admin:create` from a source checkout or deployment
workspace with dev tooling installed. The production Docker image is optimized
for running the API and migrations, not for executing TypeScript bootstrap
scripts.
