---
name: scp-rbac-reuse-auth-context
description: Enforce single auth context loading per request by making AuthGuard load/store session context once and requiring RbacGuard to reuse it without extra Redis/DB fetches. Use when auth/rbac guards duplicate lookups, miss shared context, or fail open instead of deny on missing/invalid context.
---

Goal:
- Ensure AuthGuard loads session/user context once and stores it on request context.
- Ensure RbacGuard reuses stored auth context and does not trigger extra Redis/DB reads.
- Enforce fail-closed behavior: deny access when context is missing, malformed, or untrusted.

Scope:
- AuthGuard and RbacGuard flow.
- Supporting auth context types/helpers/interceptors used by guards.
- Tests covering request flow and provider-call counts.

Workflow:
1. Trace current request flow.
- Identify where AuthGuard fetches session/user data.
- Identify where RbacGuard currently reads context or re-fetches from Redis/DB.
- Locate request context storage key and typing.

2. Detect violations.
- Flag duplicate provider calls from RbacGuard for data already fetched by AuthGuard.
- Flag fallback logic that allows access when context is missing/invalid.
- Flag direct provider reads in RBAC path that bypass shared auth context.

3. Apply minimal fix.
- In AuthGuard, persist validated context once per request.
- In RbacGuard, read only from stored context for auth identity data.
- Deny with module exception when context is absent/invalid (fail-closed).
- Keep message keys/codes stable and avoid leaking raw provider errors.

4. Preserve boundaries.
- Keep Clean Architecture direction and existing module contracts.
- Do not introduce new dependencies.
- Avoid unrelated refactors.

Test updates (when needed):
- Add/update guard tests to prove:
  - AuthGuard performs one session load per request.
  - RbacGuard reuses stored context.
  - Missing/invalid context is denied.
  - No extra Redis/DB call occurs in RBAC after AuthGuard success.

Output format:
- Goal
- Files changed
- Patch-only summary
- Tests updated (if any)
- Verification commands + results

Verification:
- Run focused auth/rbac tests first when available.
- Then run full required checks:
  - `npm test`
  - `npm run lint`
  - `npm run build`

Checklist before finish:
- Auth context fetched once and reused.
- RbacGuard avoids redundant Redis/DB fetches.
- Missing/invalid context denies access.
- No fail-open path remains.
- Diff remains minimal and scoped.
