---
name: scp-csrf-contract-kit
description: Standardize CSRF extraction and attachment in e2e/contract tests by accepting `__Host-csrf` from response headers or login cookies and consistently sending both CSRF header and cookie on mutating requests. Use when POST/PUT/PATCH/DELETE tests fail due to inconsistent CSRF handling.
---

Goal:
- Unify CSRF helper behavior across e2e/contract tests.
- Accept `__Host-csrf` token from response-set cookies or login cookie jar.
- Ensure mutating requests consistently attach CSRF header plus CSRF/session cookies.

Scope:
- Test helper utilities for auth/cookie/csrf extraction.
- Contract/e2e suites issuing POST/PUT/PATCH/DELETE requests.
- Existing failing suites affected by CSRF mismatch.

Workflow:
1. Inventory CSRF handling in tests.
- Locate helper functions parsing `set-cookie` and building auth headers.
- Find direct per-test CSRF logic and duplicate cookie parsing.

2. Standardize extraction.
- Implement a single helper that resolves `__Host-csrf` from:
  - current response cookies, or
  - previously stored login/auth cookies.
- Keep parsing deterministic and resilient to cookie order/shape.

3. Standardize request attachment.
- For mutating requests, always attach:
  - CSRF header (project-convention header name), and
  - cookie header including session + `__Host-csrf`.
- Avoid altering GET/HEAD behavior unless explicitly required.

4. Apply minimal suite updates.
- Replace ad-hoc CSRF setup with shared helper usage.
- Update only failing/relevant suites first; avoid broad rewrites.

5. Re-run failing suites.
- Execute targeted suites that were failing due to CSRF.
- Confirm failures are resolved without breaking unrelated contracts.

Output format:
- Goal
- Files changed
- Patch-only summary (minimal)
- Failing suites rerun + outcomes
- Verification commands + results

Verification:
- Run targeted failing e2e/contract suites first.
- Then run full required checks:
  - `npm test`
  - `npm run lint`
  - `npm run build`

Checklist before finish:
- `__Host-csrf` extraction supports response cookies and login cookies.
- POST/PUT/PATCH/DELETE tests consistently send CSRF header + cookie.
- Previously failing CSRF suites pass.
- Diff is minimal and scoped.
