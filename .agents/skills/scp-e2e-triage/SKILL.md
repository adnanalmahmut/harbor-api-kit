---
name: scp-e2e-triage
description: Triage and stabilize many failing Jest E2E suites by reproducing with `npm run test:e2e`, grouping failures by root cause (CSRF, auth/session, RBAC, env/test DB/Redis, contract envelope), and executing minimal-diff fixes in ordered P0/P1 batches with verification after each batch.
---

Goal:
- Restore E2E stability when failures span multiple suites.
- Separate symptoms from shared root causes before patching.
- Keep diffs minimal and scoped to the failing causes.

Workflow:
1. Reproduce baseline exactly.
- Run `npm run test:e2e` first; do not start with isolated suites.
- Capture failing suites/tests and dominant error signatures.

2. Group failures by root cause bucket.
- `CSRF`: missing/invalid CSRF header/cookie pairing, token extraction drift.
- `auth/session`: login/session bootstrapping, cookie reuse, Redis session invalidation/state.
- `RBAC`: role/permission seed/assignment gaps, cache invalidation, guard behavior.
- `env/test DB/Redis`: wrong `.env.test` usage, wrong ports, stale data/cache, seed/migration mismatch.
- `contract envelope`: response shape drift from `{ success: ... }` contract or improper envelope bypass.

3. Prioritize and stage patch plan.
- Define `P0` for fixes that unblock many suites or invalidate baseline assumptions (env, DB/Redis, auth bootstrap, shared helpers).
- Define `P1` for module-specific or lower-blast-radius fixes after P0 stabilizes.
- Keep each batch small and reviewable.

4. Execute minimal diffs batch-by-batch.
- Apply only files required for the current batch root cause.
- Avoid drive-by refactors and architecture drift.
- Reuse existing helpers/patterns before adding new logic.

5. Verify after every batch.
- Re-run impacted suites (or targeted e2e tests) after each batch.
- Re-run full `npm run test:e2e` once batch-level failures are resolved.
- Before finish, run required project checks:
  - `npm test`
  - `npm run lint`
  - `npm run build`

Output format:
- Baseline reproduction summary (`npm run test:e2e`)
- Failure groups by root cause bucket
- Ordered patch plan (`P0`, `P1`) with batch scope
- Per-batch files changed + verification results
- Final verification commands + results

Checklist before finish:
- Initial failure set reproduced with `npm run test:e2e`.
- Every failure mapped to one of the required root-cause buckets.
- Patch plan documented in ordered `P0`/`P1` batches.
- Minimal diffs applied and verified after each batch.
- Final required checks reported: `npm test`, `npm run lint`, `npm run build`.
