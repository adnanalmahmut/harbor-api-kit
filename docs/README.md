# `docs/` — practical guides for `core-platform-api`

This directory operationalizes the architecture and rules. The two governing documents are:

- [ARCHITECTURE.md](../ARCHITECTURE.md) — *what* the architecture is.
- [AGENTS.md](../AGENTS.md) — *how* to behave when writing code in it.

Everything in `docs/` exists to make those two documents executable.

## Reading order

**For an AI agent picking up a feature task:**
1. [adding-a-feature.md](adding-a-feature.md) — the workflow.
2. [workflow-checklist.md](workflow-checklist.md) — Definition of Done.

**For a human onboarding to the project:**
1. [../ARCHITECTURE.md](../ARCHITECTURE.md)
2. [adding-a-feature.md](adding-a-feature.md)
3. [module-boundaries.md](module-boundaries.md)
4. [file-organization.md](file-organization.md)
5. [shared-core-extraction.md](shared-core-extraction.md)
6. [testing.md](testing.md)
7. [workflow-checklist.md](workflow-checklist.md)

## Index

| Doc | Purpose |
|-----|---------|
| [adding-a-feature.md](adding-a-feature.md) | Step-by-step procedure for scaffolding a new feature or extending an existing one. |
| [module-boundaries.md](module-boundaries.md) | Allowed and forbidden imports between modules and layers. Public API rules. |
| [file-organization.md](file-organization.md) | When to merge files, when to split, naming conventions, size thresholds. |
| [shared-core-extraction.md](shared-core-extraction.md) | What belongs in `core/` vs what stays feature-owned. The three-signal rule. |
| [testing.md](testing.md) | Unit, contract, and e2e test expectations. Test environment setup. Troubleshooting. |
| [workflow-checklist.md](workflow-checklist.md) | Per-task checklists and the Definition of Done. |

## Maintenance

These docs are governed by [ARCHITECTURE.md](../ARCHITECTURE.md) and [AGENTS.md](../AGENTS.md). When those two change, this directory MUST be updated to match. Contradictions between `docs/` and the governing files are resolved in favor of the governing files.
