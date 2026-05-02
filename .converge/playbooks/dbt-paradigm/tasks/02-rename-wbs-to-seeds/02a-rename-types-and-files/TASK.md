---
title: Rename WBS types, interfaces, and source files to seed terminology
description: |
  Rename all WBS-related identifiers in the source code. Keep the same
  logic — only the names change. Red: grep for old names (must find them).
  Green: rename until grep returns nothing.

inputs:
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/task-definition.ts
  - packages/core/src/executor/seed-executor.ts
  - packages/core/src/executor/seed-target-utils.ts
  - packages/core/src/executor/script-seed-executor.ts
  - packages/core/src/executor/index.ts

outputs:
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/task-definition.ts
  - packages/core/src/executor/seed-executor.ts
  - packages/core/src/executor/seed-target-utils.ts
  - packages/core/src/executor/script-seed-executor.ts
  - packages/core/src/executor/index.ts

checks:
  - id: typecheck-green
    cmd: test -f packages/core/src/executor/seed-executor.ts && pnpm --filter @converge/core typecheck
    description: Core typechecks after rename.
  - id: old-names-gone
    cmd: test -f packages/core/src/executor/seed-executor.ts && ! grep -rq 'WbsExecutor\\|WbsContext\\|WbsFn\\|TaskMdWbs\\|WbsSpawnTarget\\|createScriptWbsFn\\|createAiWbsFn' packages/core/src/
    description: No old WBS type/function names in core source.
  - id: tests-green
    cmd: test -f packages/core/src/executor/seed-executor.ts && pnpm --filter @converge/core test
    description: Core tests pass.

skills: []
references:
  - "packages/core/src/config/task-md-definition.ts"
  - "packages/core/src/executor/seed-executor.ts"

vars: {}
dependencies: []
---

# 02a — Rename types and files

Search-and-replace rename. No logic changes.

## Rename map

| Old name | New name |
|---|---|
| `TaskMdWbs` | `TaskMdSeed` |
| `WbsContext` | `SeedContext` |
| `WbsFn` | `SeedFn` |
| `WbsSpawnTarget` | `SeedSpawnTarget` |
| `WbsSpawnOptions` | `SeedSpawnOptions` |
| `WbsExecutor` | `SeedExecutor` |
| `WbsExecutorResult` | `SeedExecutorResult` |
| `createScriptWbsFn` | `createScriptSeedFn` |
| `createAiWbsFn` | `createAiSeedFn` |
| `parseWbs()` | `parseSeed()` |
| `wbsFn` (variable) | `seedFn` |
| `wbs-executor.ts` | `seed-executor.ts` |
| `wbs-target-utils.ts` | `seed-target-utils.ts` |
| `script-wbs-executor.ts` | `script-seed-executor.ts` |

## Red phase

```bash
# Count old names — must be > 0
grep -rc 'WbsExecutor\|WbsContext\|WbsFn\|TaskMdWbs' packages/core/src/
```

## Green phase

For each file:
1. Rename the file (git mv).
2. Search-and-replace all old names with new names.
3. Update all imports across the codebase.
4. Verify `pnpm --filter @converge/core typecheck` passes after each file.

Order: task-definition.ts first (types), then task-md-definition.ts (parser),
then the executor files, then script-seed-executor.ts, then index.ts exports.

## Refactor

Run full test suite after all renames. Fix any test that references old names.

## Done when

All 3 checks pass. Every WBS identifier renamed to seed. Same logic, new names.
