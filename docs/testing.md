# Testing

This document defines the testing expectations referenced from [AGENTS.md §13](../AGENTS.md#13-testing--must) and step 10 of [adding-a-feature.md](adding-a-feature.md).

There are three test layers: **unit**, **contract**, and **e2e**. Each has a fixed location and conventions.

---

## 1. Test layout

| Layer | Location | Pattern | Runner config |
|-------|----------|---------|---------------|
| Unit | Co-located with source | `src/**/*.spec.ts` | `test/jest-unit.json` |
| Contract | `test/` | `test/<module>.contract-spec.ts` | `test/jest-e2e.json` |
| E2E | `test/` | `test/<module>.e2e-spec.ts` | `test/jest-e2e.json` |

Unit specs live next to the file they test (e.g., [src/modules/users/application/use-cases/create-user.use-case.spec.ts](../src/modules/users/application/use-cases/create-user.use-case.spec.ts) next to `create-user.use-case.ts`).

Contract and e2e specs live under [test/](../test/) and use the helpers in [test/helpers/](../test/helpers/).

---

## 2. Unit tests — what to cover

For each new use case:

- One spec file co-located as `<use-case>.spec.ts`.
- Mock the port(s) the use case depends on. Use `jest.Mocked<PortInterface>`.
- Assert behavior, not implementation.
- Cover the happy path and every distinct failure case the use case throws (each maps to a static factory on a `*.Exception` class).

Boilerplate:

```ts
import { jest } from '@jest/globals';
import { CreateUserUseCase } from './create-user.use-case.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port.js';
import { UsersException } from '../exceptions/users.exception.js';

describe('CreateUserUseCase', () => {
  let repo: jest.Mocked<UserRepositoryPort>;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    repo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    };
    useCase = new CreateUserUseCase(repo);
  });

  it('creates a user when email is unique', async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockImplementation(async (u) => u);

    await useCase.execute({ email: 'a@b.c', name: 'A' });

    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('throws conflict when the email already exists', async () => {
    repo.findByEmail.mockResolvedValue({} as never);
    await expect(
      useCase.execute({ email: 'a@b.c', name: 'A' }),
    ).rejects.toBeInstanceOf(UsersException);
  });
});
```

Reference: [src/modules/users/application/use-cases/create-user.use-case.spec.ts](../src/modules/users/application/use-cases/create-user.use-case.spec.ts).

---

## 3. Contract tests — what to cover

For each new endpoint:

- A test in `test/<module>.contract-spec.ts` that exercises the endpoint via Supertest against a real `NestFastifyApplication`.
- The happy path (`200`/`201`).
- The relevant subset of `400` (validation), `401` (auth), `403` (permission), `404` (not found), `409` (conflict).
- Asserts on the **envelope shape** (`success`, `message`, `data` for success; `success`, `message`, optional `errors` for failure).

Use the existing helpers:
- [test/helpers/test-app.factory.ts](../test/helpers/test-app.factory.ts) — boots a NestJS app against the test DB and Redis.
- [test/helpers/auth.helper.ts](../test/helpers/auth.helper.ts) — sets up authenticated cookies.
- [test/helpers/rbac.helper.ts](../test/helpers/rbac.helper.ts) — seeds roles/permissions.
- [test/helpers/test-db.helper.ts](../test/helpers/test-db.helper.ts) — `resetDb(prisma)` between tests.
- [test/helpers/test-redis.helper.ts](../test/helpers/test-redis.helper.ts) — `clearRedisCache(redis)` between tests.

Reference: [test/users.contract-spec.ts](../test/users.contract-spec.ts).

### Contract test rules

- **Never mock the database.** Use the real test Postgres (port 5435).
- **Never mock Redis.** Use the real test Redis (port 6380).
- **Always** call `resetDb` and `clearRedisCache` in `beforeEach` to keep tests independent.
- **Always** include the CSRF cookie + header on cookie-bearing mutating requests.

---

## 4. E2E tests — when to add them

Contract tests cover one module's endpoints. E2E tests cover **flows that span modules**:

- Auth flow: register → verify email → login → fetch session → logout.
- RBAC flow: assign role → call protected endpoint → revoke role → verify 403.
- Files flow: upload → list → download → delete.

Add an e2e spec when the value of the test is in the *interaction* between modules, not in the individual endpoints.

Reference: [test/auth.e2e-spec.ts](../test/auth.e2e-spec.ts), [test/rbac-admin.e2e-spec.ts](../test/rbac-admin.e2e-spec.ts).

---

## 5. Test environment

### Required environment

- **Config**: `.env.test` only. Never use `.env`.
- **Database**: Postgres on `localhost:5435`. Use `docker-compose.test.yml` (`docker compose -f docker-compose.test.yml up -d`).
- **Redis**: Redis on `localhost:6380`.
- **`APP_ENV`**: must be `test` for seeders and the env loader.

### Common commands

```bash
# Start the test stack
docker compose -f docker-compose.test.yml up -d

# Run unit tests
npm test

# Run contract + e2e
npm run test:e2e

# Run a single contract spec
npm run test:e2e -- users.contract-spec

# Reset the test DB manually
docker exec -i harbor_api_kit_test_db psql -U test_user -d harbor_api_kit_test -c "TRUNCATE ... CASCADE;"

# Flush test Redis manually
docker exec -i harbor_api_kit_test_redis redis-cli FLUSHALL
```

---

## 6. i18n in tests

Whenever a test asserts on a user-facing message (success or error), it MUST:

1. Either assert on the **messageKey** (e.g., `'users.errors.user_not_found'`) and confirm a key was looked up,
2. Or assert on the translated value for a **specific locale** by setting an `Accept-Language` or query-string locale.

New i18n keys MUST exist in **both** `locales/en-US/<module>.json` and `locales/ar-SY/<module>.json` before the test passes — a missing locale fails the Definition of Done even if no test catches it.

---

## 7. Coverage expectations (by behavior)

Coverage is measured by **what is asserted**, not by line percentage:

- Every public use case → ≥ 1 happy-path unit test.
- Every distinct error case a use case throws → ≥ 1 unit test.
- Every controller endpoint → ≥ 1 contract test for happy path + every documented failure status code.
- Every cross-module flow → 1 e2e test if business-critical (auth, RBAC, payments later, files lifecycle).
- Cache invalidation logic → ≥ 1 contract test that exercises the invalidation trigger and verifies post-conditions.

Line-percentage coverage is informational only. A 100%-covered use case missing the conflict path is **not** done.

---

## 8. Troubleshooting

| Issue | Root cause | Solution |
|-------|------------|----------|
| 403 after role assignment in a contract test | `clearRedisCache()` did not match the prefix actually used | Add the relevant prefix pattern to `clearRedisCache` in [test/helpers/test-redis.helper.ts](../test/helpers/test-redis.helper.ts) |
| Migrate / reset hits the wrong DB | `APP_ENV` did not override `DATABASE_URL` | Set `DATABASE_URL` explicitly for the command, or run via the npm script that wires `.env.test` |
| Seed fails | `.env.test` is missing a `SEED_*` variable | Copy from `.env.test.example` |
| `jest is not defined` in a spec | Missing import | `import { jest } from '@jest/globals';` |
| `jest.fn()` types are `any` | Generic missing | Type as `jest.Mocked<PortInterface>` |
| CSRF token missing in a contract test | Did not call the helper that fetches it | Call `fetchCsrf(cookies)` before the mutating request |

### Pre-flight checklist for contract tests

1. `.env.test` has every required variable.
2. The test stack is running (`docker compose -f docker-compose.test.yml ps`).
3. `REDIS_PREFIX` matches the patterns cleared by `clearRedisCache()`.
4. `resetDb` and `clearRedisCache` are called in `beforeEach`.
5. CSRF cookie + header are attached on mutating requests.
