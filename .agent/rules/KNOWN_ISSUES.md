2026-02-02 - New Findings

- No new issues found in this pass.

2026-02-03 - New Findings

- `npm run lint` fails with restricted import errors in `src/modules/auth/presentation/http/auth.controller.ts`, `src/modules/auth/presentation/http/guards/auth.guard.ts`, `src/modules/files/presentation/http/files.controller.ts`, and `src/modules/files/presentation/http/public-files.controller.ts`.
- `npm run typecheck` fails because the `typecheck` script is missing in package.json.
- `npm run test:e2e -- --testPathPattern="security|files"` fails in `test/security.e2e-spec.ts` because no `__Host-csrf` cookie is returned by `/api/v1/auth/me`, leaving `csrfCookie` undefined.
- `npm run test:e2e -- --testPathPattern="rbac|users"` failed (and timed out) with 403s in `test/rbac.e2e-spec.ts` and `test/rbac-admin.e2e-spec.ts`, showing `core.errors.security.csrf_token_missing` during admin/user POST/PUT requests.
