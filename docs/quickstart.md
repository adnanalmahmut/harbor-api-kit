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
npm run bootstrap:rbac
npm run start:dev
```

The API runs at `http://localhost:5000/api/v1/`.

When `ENABLE_DOCS=true`, Scalar/OpenAPI docs are available at
`http://localhost:5000/documentation`.

`npm run bootstrap:rbac` idempotently ensures roles, permissions, and built-in
role-permission assignments. It does not create users, sessions, demo accounts,
or passwords.

Create an admin user only when you need one through the explicit one-off CLI:

```bash
npm run admin:create -- \
  --email admin@example.com \
  --password replace-with-a-long-random-password \
  --first-name Admin \
  --last-name User
```

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
