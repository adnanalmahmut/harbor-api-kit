# Admin and RBAC Bootstrap

This project separates permission bootstrapping from user creation.

## RBAC Bootstrap

Run the RBAC bootstrap after migrations in any environment:

```bash
npm run bootstrap:rbac
```

It is safe and idempotent. It creates or updates:

- System roles from `DEFAULT_ROLES`.
- Canonical permissions from `PERMISSION_CATALOG`.
- Role-permission assignments for the built-in admin and user roles.

It does not create users, demo accounts, sessions, or passwords.

`npx prisma db seed` points to the same RBAC bootstrap for Prisma workflows.

## Admin CLI

Create or ensure an administrator with:

```bash
npm run admin:create -- \
  --email admin@example.com \
  --password replace-with-a-long-random-password \
  --first-name Admin \
  --last-name User
```

The CLI accepts these inputs as flags or environment variables:

| Flag           | Environment variable | Required |
| -------------- | -------------------- | -------- |
| `--email`      | `ADMIN_EMAIL`        | Yes      |
| `--password`   | `ADMIN_PASSWORD`     | Yes      |
| `--first-name` | `ADMIN_FIRST_NAME`   | Yes      |
| `--last-name`  | `ADMIN_LAST_NAME`    | Yes      |
| `--locale`     | `ADMIN_LOCALE`       | No       |
| `--image`      | `ADMIN_IMAGE`        | No       |

The password has no default and must be at least 12 characters long.

If the user already exists, the CLI updates the profile fields and ensures the
admin role. It does not reset the existing password.

## Production Usage

In production, run migrations first, then RBAC bootstrap, then create the first
admin user as a one-off operation:

```bash
APP_ENV=production npm run bootstrap:rbac
APP_ENV=production npm run admin:create -- \
  --email admin@example.com \
  --password replace-with-a-long-random-password \
  --first-name Admin \
  --last-name User
```

Provide `DATABASE_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET` through the
deployment environment. Do not commit production `.env` files.
