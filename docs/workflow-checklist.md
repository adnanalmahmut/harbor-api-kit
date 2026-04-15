# Workflow checklist

This document collects the per-task checklists referenced from [AGENTS.md](../AGENTS.md) and [adding-a-feature.md](adding-a-feature.md). The Definition of Done at the bottom is **the** completion bar — every task ends here.

---

## 1. Creating a new feature

Follow [adding-a-feature.md](adding-a-feature.md) start-to-finish. Tick each item:

- [ ] Step 1 — Decided new module vs. extension consciously.
- [ ] Step 2 — Folder structure scaffolded; matches the canonical layout.
- [ ] Step 3 — Domain authored: entities, value objects, ports, domain exceptions if any.
- [ ] Step 4 — Application authored: use cases, application exceptions, mappers.
- [ ] Step 5 — Infrastructure authored: repository adapter(s), provider adapter(s).
- [ ] Step 6 — Presentation authored: controller, Zod DTOs, guards if any.
- [ ] Step 7 — NestJS module wired: providers via tokens, controllers listed, exports declared.
- [ ] Step 8 — Public API exposed via `index.ts`. No deep cross-module imports introduced.
- [ ] Step 9 — i18n keys added to **all** locales for every new user-facing message.
- [ ] Step 10 — Unit specs for every use case, contract spec for every endpoint.
- [ ] Step 11 — Docs updated if architecture or boundaries changed.
- [ ] Step 12 — Definition of Done passes (§4).

---

## 2. Modifying an existing feature

- [ ] Read the existing module's `<feature>.module.ts`, `index.ts`, and the affected layer's existing files **before** editing.
- [ ] Confirm the change fits within the existing layer responsibilities. If it doesn't, the change is in the wrong place — stop and rethink.
- [ ] Keep the diff minimal. No drive-by refactors. No opportunistic renames. No "improvements" outside the task scope.
- [ ] If you discover an existing rule violation in the file, **do not fix it in this PR** unless the fix is required for your task. Note it as follow-up.
- [ ] If your change adds a new public symbol that another module needs, extend the module's `index.ts` — do not let consumers deep-import.
- [ ] If your change adds a new error case, add the i18n key to all locales and a unit test that asserts the new exception path.
- [ ] If your change touches an endpoint, update the contract test (or add new assertions). Do not delete existing assertions to make tests pass.
- [ ] Definition of Done passes (§4).

---

## 3. Introducing shared logic

Before extracting anything to `core/`, walk through [shared-core-extraction.md](shared-core-extraction.md):

- [ ] Signal 1 — Confirmed used by ≥ 2 features (actually used, not "could be").
- [ ] Signal 2 — Confirmed no feature-specific domain meaning.
- [ ] Signal 3 — Confirmed it is framework infrastructure or a cross-cutting concern.
- [ ] If any signal failed, the code stays feature-owned. Do not extract.
- [ ] If all three passed, open a **dedicated PR** for the extraction (no feature work bundled).
- [ ] Updated [ARCHITECTURE.md §8.1](../ARCHITECTURE.md#81-what-lives-in-core) and any affected docs.
- [ ] Definition of Done passes (§4).

---

## 4. Definition of Done

A change is **done** when every box below is ticked:

### Build & test

- [ ] `npm run lint` — passes with no new warnings.
- [ ] `npm run build` (or `npx tsc --noEmit`) — passes.
- [ ] `npm test` — passes (unit).
- [ ] `npm run test:e2e` — passes (contract + e2e relevant to the change).

### Architecture

- [ ] No new `eslint-disable` directives on import or layer rules.
- [ ] No new `@ts-ignore` / `@ts-expect-error` to bypass architectural constraints.
- [ ] All new cross-module imports go through the target module's root `index.ts`. No deep imports.
- [ ] Layer rules respected: domain pure, application port-only, infrastructure adapters, presentation thin.
- [ ] No new `process.env` reads outside `core/infrastructure/config/`.
- [ ] No new `console.*` calls.
- [ ] No new `class-validator` / `class-transformer` imports.

### Contracts & messaging

- [ ] All new endpoints flow through the response envelope.
- [ ] `@SkipEnvelope()` not used (or, if used, on a documented webhook with a contract test).
- [ ] All new errors are `AppException` subclasses with stable `AppErrorCode` and `messageKey`.
- [ ] All new user-facing messages have i18n keys in **all** locales (`en-US`, `ar-SY`).

### Dependencies

- [ ] No new runtime dependency, **or** the new dependency is justified in the PR description.

### Documentation

- [ ] [ARCHITECTURE.md](../ARCHITECTURE.md) updated if architecture, layer rules, or the cross-module map changed.
- [ ] [docs/](README.md) updated if a new pattern or convention was introduced.
- [ ] PR description states which checklist (§1, §2, §3) was followed and confirms this Definition of Done passes.
