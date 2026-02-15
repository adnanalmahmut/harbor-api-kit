---
name: scp-skip-envelope-policy
description: Audit and enforce SKIP_ENVELOPE policy across NestJS controllers by allowing bypass only for documented and tested exceptions (raw streams/webhooks). Use when endpoints return non-enveloped responses, contracts drift, or envelope bypass risks breaking API consistency.
---

Goal:
- Find all `SKIP_ENVELOPE` usages.
- Keep only policy-approved exceptions (raw streaming and documented webhooks).
- Update controllers/contracts/tests with minimal diffs while preserving file streaming behavior.

Scope:
- Presentation layer controllers/interceptors/decorators using `SKIP_ENVELOPE`.
- Contract tests validating response envelope.
- File streaming and webhook endpoints that legitimately bypass envelope.

Workflow:
1. Inventory usage.
- Search all `SKIP_ENVELOPE` references and related custom decorators.
- Map each usage to endpoint purpose: standard JSON, raw stream, webhook callback, or unknown.

2. Classify and decide.
- Keep bypass only when endpoint must return raw stream bytes/headers or webhook raw response.
- Remove bypass from regular JSON APIs and restore standard success/error envelope.
- Ensure each kept bypass is documented in code comments and covered by contract tests.

3. Apply minimal changes.
- Update controller decorators/metadata only where needed.
- Preserve stream semantics (content-type, content-disposition, pipe/stream handling).
- Adjust API contracts/tests for envelope vs bypass behavior.
- Avoid changing business logic unless required by contract correction.

4. Validate safety.
- Verify no accidental envelope wrapping of streaming endpoints.
- Verify non-stream/non-webhook endpoints always return envelope with `success` field.
- Keep module boundaries and existing response conventions.

Output format:
- Goal
- Files changed
- Patch-only summary
- Contract test adjustments
- Verification commands + results

Verification:
- Run targeted contract/e2e tests for touched endpoints first.
- Then run full required checks:
  - `npm test`
  - `npm run lint`
  - `npm run build`

Checklist before finish:
- Every `SKIP_ENVELOPE` usage is justified as raw stream or webhook.
- Kept exceptions are documented and tested.
- File streaming behavior remains intact.
- Standard endpoints keep envelope contract.
- Diff remains minimal and scoped.
