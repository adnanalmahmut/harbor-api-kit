---
name: scp-provider-failures-wrap
description: Detect and fix unwrapped provider failures in NestJS modules using Prisma/Redis/providers by wrapping failures into module AppException variants (AuthException, RbacException, FilesException). Use when repositories/services leak raw provider errors, unstable codes/messages, or sensitive details in API responses/logs.
---

Goal:
- Find provider-originated failures that are not wrapped.
- Wrap them into the module exception type without leaking raw error details.
- Deliver minimal patch, touched files list, and verification commands.

Scope:
- NestJS repositories/services in Auth, RBAC, and Files modules.
- Provider boundaries: Prisma, Redis, external provider SDKs/adapters.

Workflow:
1. Locate risky code paths.
- Search for provider calls in repositories/services (`prisma`, `redis`, provider clients).
- Prioritize methods used by controllers/use-cases that can surface provider errors.

2. Identify unwrapped failures.
- Flag direct provider calls without `try/catch` where module conventions require wrapping.
- Flag rethrows or logs that include raw error objects/messages/stacks exposed to clients.
- Flag unstable/non-i18n-facing messages or framework/provider exception leakage.

3. Apply minimal wrapping.
- Add narrow `try/catch` around provider boundaries only.
- Throw module exceptions (`AuthException`, `RbacException`, `FilesException`) with stable message keys/codes.
- Keep safe internal context in logs only if already established by module conventions.
- Never include tokens, cookies, secrets, provider payloads, or raw stack traces in client-visible messages.

4. Preserve architecture/contracts.
- Keep layer boundaries intact (no infra leakage into Domain/Application).
- Keep API envelope behavior unchanged.
- Avoid drive-by refactors and dependency changes.

Output format:
- Goal
- Files changed
- Patch-only summary (minimal)
- Verification commands + results

Verification:
- Run targeted tests first when available for changed module.
- Then run required full checks:
  - `npm test`
  - `npm run lint`
  - `npm run build`

Checklist before finish:
- All provider failures touched are wrapped into module AppException variants.
- No raw provider error details leak to client responses.
- No sensitive details logged.
- Diff is minimal and focused.
