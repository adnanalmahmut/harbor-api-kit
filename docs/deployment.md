# Deployment

The included production Compose file is a reference deployment for a single
host. It includes PostgreSQL, Redis, the API container, and Nginx.

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Production Notes

- Provide real secrets through your deployment environment.
- Do not commit `.env.production` or any real secret file.
- Run migrations as a controlled deployment step for multi-replica systems.
- Use managed PostgreSQL and Redis for production workloads when possible.
- Terminate TLS at a trusted proxy or load balancer.

## Migrations

For a single-container deployment, `npx prisma migrate deploy` can be run during
startup or deployment. For multi-replica deployments, run migrations once before
rolling out API replicas.

## RBAC and Admin Bootstrap

After migrations, bootstrap RBAC. This is safe in development, test, staging,
and production because it idempotently ensures roles, permissions, and built-in
role-permission assignments only. It does not create users, sessions, demo
accounts, or passwords.

```bash
APP_ENV=production npm run bootstrap:rbac
```

Run `bootstrap:rbac` and `admin:create` from a source checkout or deployment
workspace with dev tooling installed. The production Docker image is optimized
for running the API and migrations, not for executing TypeScript bootstrap
scripts.

Create the first admin through the dedicated one-off CLI. The CLI has no default
password and does not create demo users.

```bash
APP_ENV=production npm run admin:create -- \
  --email admin@example.com \
  --password replace-with-a-long-random-password
```

See [admin-bootstrap.md](admin-bootstrap.md) for full details.
