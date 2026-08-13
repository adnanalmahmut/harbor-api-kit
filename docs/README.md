# `docs/` — practical guides for `harbor-api-kit`

This directory operationalizes the architecture and rules. The two governing documents are:

- [ARCHITECTURE.md](../ARCHITECTURE.md) — _what_ the architecture is.
- [AGENTS.md](../AGENTS.md) — _how_ to behave when writing code in it.

Everything in `docs/` exists to make those two documents executable.

## Reading order

**For an AI agent picking up a feature task:**

1. [adding-a-feature.md](adding-a-feature.md) — the workflow.
2. [workflow-checklist.md](workflow-checklist.md) — Definition of Done.

**For a human onboarding to the project:**

1. [../ARCHITECTURE.md](../ARCHITECTURE.md)
2. [quickstart.md](quickstart.md)
3. [configuration.md](configuration.md)
4. [api-conventions.md](api-conventions.md)
5. [admin-bootstrap.md](admin-bootstrap.md)
6. [auth-authorization.md](auth-authorization.md)
7. [adding-a-feature.md](adding-a-feature.md)
8. [module-boundaries.md](module-boundaries.md)
9. [file-organization.md](file-organization.md)
10. [shared-core-extraction.md](shared-core-extraction.md)
11. [testing.md](testing.md)
12. [workflow-checklist.md](workflow-checklist.md)

## Index

| Doc                                                    | Purpose                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [adding-a-feature.md](adding-a-feature.md)             | Step-by-step procedure for scaffolding a new feature or extending an existing one.  |
| [module-boundaries.md](module-boundaries.md)           | Allowed and forbidden imports between modules and layers. Public API rules.         |
| [file-organization.md](file-organization.md)           | When to merge files, when to split, naming conventions, size thresholds.            |
| [persistence.md](persistence.md) | The contract that keeps Prisma replaceable: repository ports, transactions, error mapping. |
| [shared-core-extraction.md](shared-core-extraction.md) | What belongs in `common/` / `infrastructure/` vs what stays feature-owned. The three-signal rule. |
| [quickstart.md](quickstart.md)                         | Fast local setup for new users.                                                     |
| [configuration.md](configuration.md)                   | Environment files and runtime configuration groups.                                 |
| [api-conventions.md](api-conventions.md)               | Response envelopes, auth cookies, CSRF, and validation.                             |
| [admin-bootstrap.md](admin-bootstrap.md)               | First-admin CLI usage.                                                              |
| [auth-authorization.md](auth-authorization.md)         | Better Auth native routing and the static authorization policy.                     |
| [deployment.md](deployment.md)                         | Docker production reference and deployment notes.                                   |
| [roadmap.md](roadmap.md)                               | Implemented and planned work.                                                       |
| [testing.md](testing.md)                               | Unit, contract, and e2e test expectations. Test environment setup. Troubleshooting. |
| [workflow-checklist.md](workflow-checklist.md)         | Per-task checklists and the Definition of Done.                                     |

## Maintenance

These docs are governed by [ARCHITECTURE.md](../ARCHITECTURE.md) and [AGENTS.md](../AGENTS.md). When those two change, this directory MUST be updated to match. Contradictions between `docs/` and the governing files are resolved in favor of the governing files.
