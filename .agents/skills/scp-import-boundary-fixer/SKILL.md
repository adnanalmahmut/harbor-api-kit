---
name: scp-import-boundary-fixer
description: Fix restricted import-boundary violations without bypassing lint rules by moving code to the correct architecture layer or introducing ports/adapters. Use when eslint import-boundary errors appear across Domain/Application/Infrastructure/Presentation.
---

Goal:
- Resolve restricted import errors without suppressions or rule bypasses.
- Restore Clean Architecture boundaries by relocating code or introducing ports/adapters.
- Deliver minimal patch and verified lint pass.

Scope:
- Eslint boundary violations in module/domain/application/infrastructure/presentation layers.
- Files directly participating in offending imports and required interface/adapter wiring.

Workflow:
1. Reproduce and inventory violations.
- Run lint and capture exact restricted-import errors.
- Group violations by boundary type (inner->outer, cross-module leakage, framework in domain/application, etc.).

2. Choose boundary-compliant fix.
- Prefer moving logic to the correct layer when dependency direction is wrong.
- If cross-layer capability is needed, introduce/extend a port interface in Application and implement adapter in Infrastructure.
- Reuse existing abstractions before adding new ones.

3. Apply minimal patch.
- Update imports to approved paths (`#src/...` with `.js` extensions where required).
- Add only necessary interfaces/adapters and DI wiring.
- Do not disable eslint rules or add ignore comments for boundary checks.

4. Validate behavior and structure.
- Ensure no domain/application dependency on framework, Prisma, Redis, or transport libs.
- Confirm feature behavior remains unchanged apart from boundary correction.

Output format:
- Goal
- Files changed
- Boundary mismatch list
- Patch-only summary (minimal)
- Verification commands + results

Verification:
- `npm run lint` (must pass)
- Then run required full checks:
  - `npm test`
  - `npm run lint`
  - `npm run build`

Checklist before finish:
- No import-boundary bypass/suppression added.
- Dependency direction respects Clean Architecture.
- Lint passes with boundary rules enabled.
- Diff remains minimal and scoped.
