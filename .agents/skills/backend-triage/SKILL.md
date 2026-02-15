---
name: backend-triage
description: Use when the backend fails to start/build/tests fail. Minimal fix + verified by commands.
---

Workflow:
1) Reproduce with the exact npm script.
2) Read the full error. Identify root cause (config/env/esm/types/docker/prisma).
3) Apply smallest change.
4) Verify by re-running: npm test, npm run lint, npm run build, npm run start:dev.
Output:
- Root cause
- Files changed
- Commands run
