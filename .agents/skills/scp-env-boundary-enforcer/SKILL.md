---
name: scp-env-boundary-enforcer
description: Audit and remove direct `process.env` access outside `AppConfigService` and `env.schema.ts`, refactoring to approved config boundaries. Use when modules, seeds, or infrastructure read env vars directly, causing boundary drift, nondeterministic tests, or inconsistent APP_ENV gating.
---

Goal:
- Find all `process.env` usage outside approved config boundaries.
- Refactor call sites to use validated config access through `AppConfigService` (and related approved adapters).
- Keep seeding deterministic and explicitly environment-gated (including `APP_ENV=test` behavior).

Scope:
- Any source file using `process.env` directly, except approved config boundary files.
- Seed/bootstrap scripts and test setup that depend on environment gating.
- Module/service/repository code paths affected by config access refactors.

Workflow:
1. Inventory direct env usage.
- Search for `process.env` across project sources.
- Exclude approved boundaries (`env.schema.ts`, `AppConfigService`, and explicit bootstrap exceptions if documented).
- Group findings by module and runtime impact (auth/rbac/cache/db/seed/test).

2. Classify required changes.
- Keep direct env usage only where boundary rules allow it.
- Replace disallowed usage with config service methods or typed config accessors.
- Preserve existing defaults/behavior unless boundary policy requires tightening.

3. Apply minimal refactor.
- Inject/use approved config service in affected classes.
- Avoid introducing new dependencies or broad restructuring.
- Keep interfaces/contracts stable for callers.

4. Protect seed determinism and gating.
- Ensure seed flow remains deterministic and environment-gated.
- Verify test seed behavior respects `APP_ENV=test` and does not leak to non-test environments.
- Keep any env guard checks centralized and explicit.

Output format:
- Goal
- Files changed
- Patch-only summary (minimal)
- Seed/env-gating notes
- Verification commands + results

Verification:
- Run focused tests/scripts for touched seed/config flows when available.
- Then run required full checks:
  - `npm test`
  - `npm run lint`
  - `npm run build`

Checklist before finish:
- No disallowed direct `process.env` access remains.
- Config reads flow through approved boundaries.
- Seed remains deterministic and environment-gated (`APP_ENV=test`).
- Diff remains minimal and scoped.
