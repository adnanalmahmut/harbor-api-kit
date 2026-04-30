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

## Production Seeding

Production seeding is explicitly gated:

```bash
APP_ENV=production ALLOW_PROD_SEED=true npx tsx ./prisma/seed.production.ts
```
