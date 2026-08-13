# Testing

This document defines the testing expectations referenced from [AGENTS.md §13](../AGENTS.md#13-testing--must) and step 10 of [adding-a-feature.md](adding-a-feature.md).

There are three test layers: **unit**, **contract**, and **e2e**. Each has a fixed location and conventions.

---

## 1. Test layout

| Layer    | Location               | Pattern                          | Runner config         |
| -------- | ---------------------- | -------------------------------- | --------------------- |
| Unit     | Co-located with source | `src/**/*.spec.ts`               | `test/jest-unit.json` |
| Contract | `test/`                | `test/<module>.contract-spec.ts` | `test/jest-e2e.json`  |
| E2E      | `test/`                | `test/<module>.e2e-spec.ts`      | `test/jest-e2e.json`  |

Unit specs live next to the file they test (e.g. [src/modules/authorization/authorization.service.spec.ts](../src/modules/authorization/authorization.service.spec.ts) next to `authorization.service.ts`).

Contract and e2e specs live under [test/](../test/) and use the helpers in [test/helpers/](../test/helpers/).

---

## 2. Unit tests — what to cover

For each new service method:

- One spec file co-located as `<feature>.service.spec.ts`.
- Wire it with `Test.createTestingModule` and **override the abstract port**, not the implementation. This is the standard mocking seam, and it is why a unit test survives a change of ORM untouched.
- Assert behaviour, not implementation.
- Cover the happy path and every distinct failure the method throws (each maps to a static factory on the feature's `*Exception` class).

Boilerplate:

```ts
import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { AuthorizationRepository } from './authorization.repository.js';
import { AuthorizationService } from './authorization.service.js';
import { EffectivePermissionsService } from './effective-permissions.service.js';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let repository: jest.Mocked<AuthorizationRepository>;
  let effective: { buildForUser: jest.Mock; refreshForUser: jest.Mock };

  beforeEach(async () => {
    repository = {
      getUserRole: jest.fn(),
      listUserOverrides: jest.fn(),
      setUserPermissionOverride: jest.fn(),
      removeUserPermissionOverride: jest.fn(),
      replaceUserPermissions: jest.fn(),
    } as unknown as jest.Mocked<AuthorizationRepository>;
    effective = { buildForUser: jest.fn(), refreshForUser: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: AuthorizationRepository, useValue: repository },
        { provide: EffectivePermissionsService, useValue: effective },
      ],
    }).compile();

    service = moduleRef.get(AuthorizationService);
  });

  it('stores the override and invalidates the cached permissions', async () => {
    await service.setOverride({
      userId: 'u1',
      permissionKey: 'files:delete',
      effect: 'DENY',
    });

    expect(repository.setUserPermissionOverride).toHaveBeenCalledTimes(1);
    expect(effective.refreshForUser).toHaveBeenCalledWith('u1');
  });
});
```

**Never override `PrismaService` in a unit test.** If a test needs the database, it belongs in `test/` as a contract or e2e spec.

References: [authorization.service.spec.ts](../src/modules/authorization/authorization.service.spec.ts), [health.service.spec.ts](../src/modules/health/health.service.spec.ts).

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
- [test/helpers/authorization.helper.ts](../test/helpers/authorization.helper.ts) — assigns test-specific roles and permission overrides.
- [test/helpers/test-db.helper.ts](../test/helpers/test-db.helper.ts) — `resetDb(prisma)` between tests.
- [test/helpers/test-redis.helper.ts](../test/helpers/test-redis.helper.ts) — `clearRedisCache(redis)` between tests.

Reference: [test/user-permissions.contract-spec.ts](../test/user-permissions.contract-spec.ts) — the per-user permission routes owned by the `authorization` module.

### Contract test rules

- **Never mock the database.** Use the real test Postgres (port 5435).
- **Never mock Redis.** Use the real test Redis (port 6380).
- **Always** call `resetDb` and `clearRedisCache` in `beforeEach` to keep tests independent.
- **Always** include the CSRF cookie + header on cookie-bearing mutating requests.

---

## 4. E2E tests — when to add them

Contract tests cover one module's endpoints. E2E tests cover **flows that span modules**:

- Auth flow: register → verify email → login → fetch session → logout.
- Authorization flow: assign role → call protected endpoint → add a deny override → verify 403.
- Files flow: upload → list → download → delete.

Add an e2e spec when the value of the test is in the _interaction_ between modules, not in the individual endpoints.

Reference: [test/auth.e2e-spec.ts](../test/auth.e2e-spec.ts), [test/authorization-admin.e2e-spec.ts](../test/authorization-admin.e2e-spec.ts).

---

## 5. Test environment

### Required environment

- **Config**: `.env.test` only. Never use `.env`.
- **Database**: Postgres on `localhost:5435`. Use `docker-compose.test.yml` (`docker compose -f docker-compose.test.yml up -d`).
- **Redis**: Redis on `localhost:6380`.
- **`APP_ENV`**: must be `test` for the test env loader.

### Common commands

```bash
# Start the test stack
docker compose -f docker-compose.test.yml up -d

# Run unit tests
npm test

# Run contract + e2e
npm run test:e2e

# Run a single contract spec
npm run test:e2e -- user-permissions.contract-spec

# Reset the test DB manually
docker exec -i harbor_api_kit_test_db psql -U test_user -d harbor_api_kit_test -c "TRUNCATE ... CASCADE;"

# Flush test Redis manually
docker exec -i harbor_api_kit_test_redis redis-cli FLUSHALL
```

---

## 6. i18n in tests

Whenever a test asserts on a user-facing message (success or error), it MUST:

1. Either assert on the **messageKey** (e.g., `'authorization.errors.permission_override_not_found'`) and confirm a key was looked up,
2. Or assert on the translated value for a **specific locale** by setting an `Accept-Language` or query-string locale.

New i18n keys MUST exist in **both** `locales/en-US/<module>.json` and `locales/ar-SY/<module>.json` before the test passes — a missing locale fails the Definition of Done even if no test catches it.

---

## 7. Coverage expectations (by behavior)

Coverage is measured by **what is asserted**, not by line percentage:

- Every public use case → ≥ 1 happy-path unit test.
- Every distinct error case a use case throws → ≥ 1 unit test.
- Every controller endpoint → ≥ 1 contract test for happy path + every documented failure status code.
- Every cross-module flow → 1 e2e test if business-critical (auth, authorization, payments later, files lifecycle).
- Cache invalidation logic → ≥ 1 contract test that exercises the invalidation trigger and verifies post-conditions.

Line-percentage coverage is informational only. A 100%-covered use case missing the conflict path is **not** done.

---

## 8. Troubleshooting

| Issue                                        | Root cause                                                 | Solution                                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 403 after role assignment in a contract test | `clearRedisCache()` did not match the prefix actually used | Add the relevant prefix pattern to `clearRedisCache` in [test/helpers/test-redis.helper.ts](../test/helpers/test-redis.helper.ts) |
| Migrate / reset hits the wrong DB            | `APP_ENV` did not override `DATABASE_URL`                  | Set `DATABASE_URL` explicitly for the command, or run via the npm script that wires `.env.test`                                   |
| Authorization tests fail                     | `.env.test` was not loaded or the test DB is not migrated  | Run `npm run test:e2e:prepare`; roles and inherited permissions require no seed step                                              |
| `jest is not defined` in a spec              | Missing import                                             | `import { jest } from '@jest/globals';`                                                                                           |
| `jest.fn()` types are `any`                  | Generic missing                                            | Type as `jest.Mocked<PortInterface>`                                                                                              |
| CSRF token missing in a contract test        | Did not call the helper that fetches it                    | Call `fetchCsrf(cookies)` before the mutating request                                                                             |

### Pre-flight checklist for contract tests

1. `.env.test` has every required variable.
2. The test stack is running (`docker compose -f docker-compose.test.yml ps`).
3. `REDIS_PREFIX` matches the patterns cleared by `clearRedisCache()`.
4. `resetDb` and `clearRedisCache` are called in `beforeEach`.
5. CSRF cookie + header are attached on mutating requests.
