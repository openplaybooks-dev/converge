---
title: Remove migration redirects, dead code, V1 checkpoint compat, and deprecated exports
description: |
  The framework is now fully on the dbt model. Remove all transitional
  scaffolding. Five children.

inputs:
  - packages/cli/src/migration-redirects.ts
  - packages/cli/src/main.ts
  - packages/cli/src/commands.ts
  - packages/cli/src/commands-cleanup.ts
  - packages/core/src/index.ts
  - packages/core/src/checkpoint
  - packages/core/src/task

outputs:
  - packages/cli/src
  - packages/core/src

checks:
  - id: typecheck-green
    cmd: test -f packages/cli/src/main.ts && pnpm -r typecheck
    description: Repo typechecks.
  - id: tests-green
    cmd: test -f packages/cli/src/main.ts && pnpm -r test
    description: All tests pass.
  - id: no-redirects
    cmd: test -f packages/cli/src/main.ts && ! test -f packages/cli/src/migration-redirects.ts
    description: Migration redirects file gone.
  - id: no-deprecated-exports
    cmd: test -f packages/core/src/index.ts && ! grep -q '@deprecated' packages/core/src/index.ts
    description: No deprecated symbols in public API.
  - id: no-v1-checkpoint
    cmd: test -f packages/cli/src/commands.ts && ! grep -rq 'version === 1' packages/core/src/checkpoint/ packages/core/src/task/ packages/cli/src/commands.ts packages/cli/src/next-task.ts
    description: No V1 checkpoint branching.
  - id: help-shows-dbt-commands
    cmd: test -f packages/cli/dist/index.js && node packages/cli/dist/index.js help 2>&1 | grep -q 'compile\|test\|build\|seed'
    description: Help lists dbt-model commands.

skills: []
references: []

vars: {}
dependencies:
  - 03-reusable-checks-api
children:
  - 04a-remove-redirects
  - 04b-remove-dead-code
  - 04c-remove-v1-checkpoint
  - 04d-clean-exports
  - 04e-update-help
---

# 04 — Clean break

## Children

| id | goal |
|---|---|
| `04a-remove-redirects` | Delete migration-redirects.ts + redirect logic |
| `04b-remove-dead-code` | Remove dead commands, dead functions, dead imports |
| `04c-remove-v1-checkpoint` | Strip V1 checkpoint branching from 8 locations |
| `04d-clean-exports` | Remove deprecated aliases, V1/V2-prefixed re-exports |
| `04e-update-help` | Rewrite help text to show only dbt-model commands |

## Execution order

```
04a → 04b → 04c → 04d → 04e
```

## Done when

All 6 checks pass. CLI speaks only the dbt vocabulary.
