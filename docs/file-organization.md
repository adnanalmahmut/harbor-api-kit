# File organization

This document operationalizes the file-merging policy from [ARCHITECTURE.md §7](../ARCHITECTURE.md#7-file-count-optimization-policy).

The codebase tolerates two file styles for use cases and DTOs: **one-per-file** and **grouped slices**. Both are valid. The rule is **cohesion + size**, not file count.

---

## 1. The merge policy at a glance

| | MAY merge | MUST split |
|---|-----------|------------|
| **Use cases** | Cohesive set under a single bounded concern (e.g., password lifecycle). | > ~6 use cases per file, > ~400 LOC, or two unrelated concerns appearing. |
| **Request/response DTOs** | All DTOs for a single controller. | Cross-controller DTO sharing — extract to a feature-level `presentation/http/dtos/` folder. |
| **Port interfaces** | A small, cohesive set for one feature (e.g., `auth.ports.ts` holds `AuthProviderPort` + `AuthEmailSenderPort`). | Each port begins serving an unrelated purpose. |
| **Cache keys / constants** | Per feature in `<feature>.cache-keys.ts`. | Mixing constants from multiple bounded concerns. |
| **Architectural layers** | Never. | Always. |

---

## 2. MAY merge — concrete examples in the repo

### Grouped use cases (auth)

[src/modules/auth/application/use-cases/auth.password.use-cases.ts](../src/modules/auth/application/use-cases/auth.password.use-cases.ts) groups password-lifecycle use cases (`RequestPasswordReset`, `ResetPassword`, `ChangePassword`). They share invariants, exception cases, and ports — high cohesion.

Other auth slices follow the same pattern:
- `auth.account.use-cases.ts` — registration, deletion.
- `auth.credentials.use-cases.ts` — credential management.
- `auth.sessions.use-cases.ts` — session list / revoke / logout-all.
- `auth.social.use-cases.ts` — OAuth flows.

### Grouped DTOs (files)

[src/modules/files/presentation/files.dto.ts](../src/modules/files/presentation/files.dto.ts) groups all DTOs for the files controller in one file. Acceptable because all DTOs serve the same controller and are below the size threshold.

### Grouped port set (files)

[src/modules/files/application/files.ports.ts](../src/modules/files/application/files.ports.ts) holds the small set of ports needed by the files application layer.

---

## 3. One-per-file — concrete examples in the repo

### One use case per file (users)

[src/modules/users/application/use-cases/](../src/modules/users/application/use-cases/) keeps each use case in its own file: `create-user.use-case.ts`, `add-role-to-user.use-case.ts`, etc. This is the **default** and is preferable when:

- Use cases are independently consumed (different controllers, different modules).
- Use cases have meaningfully different dependencies.
- The total count is high enough that a single file would exceed the size threshold.

### One DTO per file (users)

[src/modules/users/presentation/http/dtos/](../src/modules/users/presentation/http/dtos/) keeps DTOs separate. This is the default; choose grouping only when DTOs are small and serve one controller.

---

## 4. MUST NOT merge — examples

These mergers are forbidden regardless of size:

- A use case and the repository that backs it (different layers).
- A controller and its DTOs (different concerns; controllers are presentation orchestration, DTOs are validation contracts).
- A repository adapter and its Prisma↔domain mapper (mappers belong in `infrastructure/mappers/` once non-trivial).
- A domain entity and its value objects (each VO has its own validation).
- Two unrelated concerns under a generic name (`utils.ts`, `helpers.ts`, `misc.ts` are forbidden — name files after their actual contents).

---

## 5. Size thresholds

Heuristics for when to split:

- **~400 LOC**. If a single file exceeds this, split by sub-concern.
- **~6 exported use cases** (or DTOs) in one file.
- **More than one bounded concern** appearing in the same file. The test: can you describe the file's purpose in **one** sentence without using the words "and" or "or"? If not, split.

These are heuristics, not hard limits. A 410-LOC file with one tightly-coupled concern is fine. A 250-LOC file mixing two unrelated concerns is not.

---

## 6. Naming conventions

| Concept | File | Class / type |
|---------|------|--------------|
| Single use case | `{verb}-{noun}.use-case.ts` | `{Verb}{Noun}UseCase` |
| Grouped use cases | `<feature>.<slice>.use-cases.ts` | One class per use case (multiple per file) |
| Repository adapter | `prisma-{entity}.repository.ts` | `Prisma{Entity}Repository` |
| Repository port | `{entity}.repository.port.ts` | `{Entity}RepositoryPort` |
| Other port | `{name}.port.ts` | `{Name}Port` |
| Value object | `{name}.vo.ts` | `{Name}VO` |
| Entity | `{name}.entity.ts` | `{Name}` |
| DTO (single) | `{intent}.dto.ts` | `{Intent}Dto` extends `createStrictZodDto(...)` |
| DTO (grouped) | `<feature>.dto.ts` or `<feature>.http.dtos.ts` | One class per DTO |
| Module exception | `<feature>.exception.ts` | `{Feature}Exception extends AppException` |
| Module tokens | `<feature>.tokens.ts` | `{FEATURE}_TOKENS` constant of `Symbol`-keyed entries |
| Cache keys | `<feature>.cache-keys.ts` | `{feature}CacheKeys` constant |
| NestJS module | `<feature>.module.ts` | `{Feature}Module` |
| Public barrel | `index.ts` | (no class — pure re-export) |
| Unit spec | `{file}.spec.ts` | Co-located. |
| Contract test | `{module}.contract-spec.ts` | In `test/`. |
| E2E test | `{module}.e2e-spec.ts` | In `test/`. |

---

## 7. Folder structure rules

- A new layer subfolder MUST be named after its contents (`guards/`, `decorators/`, `mappers/`, `persistence/`, `value-objects/`).
- Avoid one-deep folders that hold a single file forever — flatten to the parent until a second file appears.
- `application/use-cases/` is the one exception: always present, even with one use case.
- `__tests__/` directories are acceptable when a feature has many unit specs that would clutter the source folder. Default is co-located `*.spec.ts`.

---

## 8. When to refactor an existing file

Refactor (split or merge) an existing file **only** when:

1. You are already touching it for a feature task, AND
2. The threshold rule is being violated, AND
3. The split / merge can be done cleanly in the same PR.

Drive-by refactors are forbidden ([AGENTS.md §0](../AGENTS.md#0-prime-directives)). If a file violates the threshold but you don't need to touch it, leave it.
