---
name: scp-redis-prefix-audit
description: Audit and fix Redis key definitions across modules to enforce the required `scp:` prefix (rbac cache keys, auth cache keys, and related helpers). Use when cache keys drift from prefix policy, test cache cleanup misses patterns, or e2e tests show stale authorization/session state.
---

Goal:
- Scan Redis key builders/usages and enforce `scp:` prefix everywhere.
- Update cache cleanup/test helpers to cover all effective key patterns.
- Deliver minimal patch with verification, including relevant e2e cache-behavior patterns.

Scope:
- RBAC/Auth cache key definitions and key-builder utilities.
- Redis invalidation/cleanup helpers (including test helpers such as `clearRedisCache`).
- Tests impacted by key-pattern changes (unit/integration/e2e).

Workflow:
1. Inventory key definitions.
- Search for Redis key literals/builders (`rbac.cache-keys.ts`, auth cache files, redis adapters, invalidation services).
- Classify keys by module and purpose (session, permissions, role mappings, throttling, etc.).

2. Detect prefix drift.
- Flag keys/patterns missing `scp:`.
- Flag mixed prefixes or hardcoded ad-hoc keys bypassing shared builders.
- Flag cleanup patterns that no longer match effective key shapes.

3. Apply minimal fixes.
- Standardize key builders to always emit `scp:`-prefixed keys.
- Update only affected call sites to use canonical key builders.
- Update `clearRedisCache`/test helpers to include new patterns and avoid stale data across tests.
- Avoid unrelated cache refactors.

4. Validate runtime behavior.
- Ensure cache invalidation still clears all relevant auth/rbac keys.
- Ensure no security regression from stale permissions/sessions.
- Keep existing module boundaries and contracts unchanged.

Output format:
- Goal
- Files changed
- Patch-only summary (minimal)
- Test helper updates
- Verification commands + results

Verification:
- Run focused tests that exercise auth/rbac cache invalidation and state changes.
- Run relevant e2e patterns for role/permission/session transitions where stale cache would fail.
- Then run full required checks:
  - `npm test`
  - `npm run lint`
  - `npm run build`

Checklist before finish:
- All Redis keys/patterns use `scp:` prefix.
- Test cleanup helpers cover effective key patterns.
- No stale-cache authorization/session behavior remains.
- Diff is minimal and scoped.
