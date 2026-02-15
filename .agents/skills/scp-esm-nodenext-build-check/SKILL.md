---
name: scp-esm-nodenext-build-check
description: "Verify NestJS build output shape under NodeNext + type:module and detect mismatches across nest-cli.json sourceRoot, tsconfig rootDir/outDir, and package.json start:prod entrypoint. Use when production startup fails due to dist path/extension drift."
---

Goal:
- Verify build output path for main entry under NodeNext ESM.
- Detect exact config mismatches among Nest CLI, tsconfig, and runtime start script.
- Apply minimal fix to align emitted `dist` structure and `start:prod` target.

Scope:
- `nest-cli.json` (`sourceRoot`, compiler options affecting output).
- `tsconfig*.json` (`module`, `moduleResolution`, `rootDir`, `outDir`, include/exclude).
- `package.json` scripts, especially `start:prod`.
- Built output paths (`dist/src/main.*` vs alternatives).

Workflow:
1. Collect build/runtime facts.
- Read `package.json`, `nest-cli.json`, and relevant `tsconfig` files.
- Run build and inspect emitted `dist` tree.
- Determine actual emitted main file path and extension.

2. Compare expected vs actual.
- Check whether config implies `dist/src/main.js`, `dist/main.js`, or another path.
- Validate `start:prod` points to the actual emitted file.
- Identify mismatches exactly (file, key, expected, actual).

3. Apply minimal fix.
- Change only necessary config/script keys.
- Preserve NodeNext + `type: module` behavior.
- Avoid unrelated refactors.

4. Re-verify runtime alignment.
- Rebuild and confirm main artifact location matches `start:prod`.
- If possible, perform lightweight startup check without changing app behavior.

Output format:
- Goal
- Files changed
- Exact mismatch list
- Patch-only summary (minimal fix)
- Verification commands + results

Verification:
- `npm run build`
- Validate dist path (`dist/src/main.*` or configured equivalent)
- Validate `npm run start:prod` entrypoint path matches emitted file
- Then run required full checks:
  - `npm test`
  - `npm run lint`
  - `npm run build`

Checklist before finish:
- Mismatch list includes exact keys and values.
- `start:prod` target matches emitted artifact.
- NodeNext + ESM settings remain intact.
- Diff remains minimal and scoped.
