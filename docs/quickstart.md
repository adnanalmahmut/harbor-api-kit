# Quickstart

This guide gets harbor-api-kit running locally with PostgreSQL and Redis.

## Prerequisites

- Node.js 22+
- npm
- Docker with Docker Compose v2

## Setup

```bash
npm install
cp .env.example .env
npm run docker:up
npx prisma migrate dev
npm run start:dev
```

The default `.env.example` uses `STORAGE_DRIVER=r2`. Supported values are
`local`, `s3` (AWS), `r2` (Cloudflare) and `spaces` (DigitalOcean). All three
remote drivers need `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` and
`S3_BUCKET`; `r2` and `spaces` also need `S3_ENDPOINT`, while `s3` is located by
region alone. Switch to `STORAGE_DRIVER=local` for quick local-only testing.

The API runs at `http://localhost:5000/api/v1/`.

When `ENABLE_DOCS=true`, Scalar/OpenAPI docs are available at
`http://localhost:5000/documentation`.

Roles and their inherited permissions are defined statically in
`src/modules/authorization/permissions.catalog.ts`; no authorization seed step is needed.

Create an admin user only when you need one through the explicit one-off CLI:

```bash
npm run admin:create -- \
  --email admin@example.com \
  --name 'Admin User' \
  --locale ar-SY
```

The CLI asks for `Admin password:` and `Confirm password:` through hidden
prompts. The password must contain 12–128 characters.

## Tests

```bash
npm run lint:check
npm run build
npm test
```

For contract and e2e tests:

```bash
cp .env.test.example .env.test
npm run test:e2e
```
