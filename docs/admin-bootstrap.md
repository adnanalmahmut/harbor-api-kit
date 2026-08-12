# Admin Bootstrap

Roles and inherited permissions are static application code. There is no authorization
seed or bootstrap command.

Create the first administrator through the explicit one-off CLI. The password
is entered and confirmed through hidden terminal prompts:

```bash
npm run admin:create -- \
  --email admin@example.com \
  --first-name Admin \
  --last-name User \
  --locale ar-SY
```

The CLI then asks for:

```text
Admin password:
Confirm password:
```

The password must contain 12–128 characters. It is never accepted as a command
line flag, which prevents it from being stored in shell history or exposed in
the process list. For non-interactive environments, inject `ADMIN_PASSWORD`
from the deployment platform's secret store. Do not save it in `.env`.

The CLI creates the credential account through Better Auth's server API, marks
the email as verified, assigns the static `admin` role, and removes the session
created during sign-up. It refuses to promote an existing account; use an
authenticated Better Auth admin route for later role changes.

In production, run migrations first and then execute the CLI from a trusted
source checkout or one-off job with `DATABASE_URL`, `BETTER_AUTH_URL`, and
`BETTER_AUTH_SECRET` available:

```bash
APP_ENV=production npm run admin:create -- \
  --email admin@example.com \
  --allow-production
```

Production execution requires `--allow-production` in addition to the required
database and Better Auth environment configuration.
