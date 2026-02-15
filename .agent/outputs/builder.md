2026-02-03

## Step 1: P0.1 - Stop Token/Session Leakage in Logs

**Status**: COMPLETED

**Changes Applied**:

- Added `safeErrorFields()` helper function to extract only safe error fields (status, code)
- Fixed `rethrowAsAppException` to log only safe fields instead of raw error objects
- Fixed `checkPassword` warn log to use safe fields
- Fixed `listLinkedAccounts` error log to use safe fields
- Fixed `invalidateUserSessions` to log userId and key count instead of actual session tokens/keys

**File Changed**: `src/modules/auth/infrastructure/better-auth/better-auth.provider.adapter.ts`

**Verification**:

- TypeScript (`npx tsc --noEmit`): PASS (no errors)
- Auth contract tests (`npm run test:e2e -- --testPathPattern=auth.contract`): 42/42 PASS
- Lint: FAIL (4 pre-existing Clean Architecture violations from P1.1, not related to this change)

**Security Impact**: Session tokens and Redis keys containing sensitive identifiers are no longer logged.

## Step 2: Fix linkSocial Success Payload Shape

**Status**: COMPLETED

**Changes Applied**:

- Removed stray `708` field from the linkSocial success data payload
- Dropped `as any` cast and aligned data to `SignInResultData` shape
- Kept `user: null as unknown as User` for redirect flow placeholder

**File Changed**: `src/modules/auth/infrastructure/better-auth/better-auth.provider.adapter.ts`

**Verification**:

- TypeScript (`npx tsc --noEmit`): PASS (no errors)
- Auth contract tests (`npm run test:e2e -- --testPathPattern=auth.contract`): 42/42 PASS

## Step 3: Remove False-Positive Guards in Tests

**Status**: COMPLETED (tests failing)

**Changes Applied**:

- Replaced conditional CSRF handling with explicit assertions and token extraction
- Replaced early returns/conditional guards with explicit `toBeDefined()` expectations

**Files Changed**:

- `test/security.e2e-spec.ts`
- `test/files.contract-spec.ts`

**Verification**:

- TypeScript (`npx tsc --noEmit`): PASS (no errors)
- E2E tests (`npm run test:e2e -- --testPathPattern="security|files"`): FAIL
  - `test/security.e2e-spec.ts` fails: `csrfCookie` undefined in “should allow POST requests with valid CSRF token”

## Step 4: Expand CSRF Cookie Extraction Sources

**Status**: COMPLETED

**Changes Applied**:

- Added `extractCsrf` helper to find `__Host-csrf` in both response and login cookies
- Updated CSRF assertions to accept tokens from either source

**File Changed**: `test/security.e2e-spec.ts`

**Verification**:

- E2E tests (`npm run test:e2e -- --testPathPattern=security`): PASS (2 suites, 7 tests)

## Step 5: Remove Message-Only Data Payloads

**Status**: COMPLETED (tests failed/timed out)

**Changes Applied**:

- Removed message-only `{ message: '...' }` payloads from RBAC and Users controllers so `@ResponseMessage` owns the envelope

**Files Changed**:

- `src/modules/rbac/presentation/http/rbac.controller.ts`
- `src/modules/users/presentation/http/users.controller.ts`

**Verification**:

- TypeScript (`npx tsc --noEmit`): PASS (no errors)
- E2E tests (`npm run test:e2e -- --testPathPattern="rbac|users"`): FAIL (timed out)
  - `test/rbac.e2e-spec.ts`: expected 201, got 403
  - `test/rbac-admin.e2e-spec.ts`: expected 201/200, got 403
