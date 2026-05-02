---
title: Rename WBS API to seeds — same logic, new names and folder structure
description: |
  Keep the current WBS API behavior intact. Rename types, files, and
  folders. Move scripts from per-task wbs/ directories to playbook-level
  seeds/ directories. Convert wbs: frontmatter to seeds: references.

  Five children. Each uses the WBS inventory from phase 01 as its checklist.

inputs:
  - .converge/playbooks/dbt-paradigm/wbs-inventory.md
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/executor/seed-executor.ts
  - packages/core/src/executor/seed-target-utils.ts
  - packages/core/src/executor/script-seed-executor.ts
  - packages/cli/src/commands-compile.ts
  - packages/cli/src/main.ts

outputs:
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/executor/seed-executor.ts
  - packages/core/src/executor/seed-target-utils.ts
  - packages/core/src/executor/script-seed-executor.ts
  - packages/core/src/config/task-definition.ts
  - packages/cli/src/commands-compile.ts
  - packages/cli/src/main.ts
  - .converge/playbooks
  - examples

checks:
  - id: typecheck-green
    cmd: test -f packages/core/src/executor/seed-executor.ts && pnpm -r typecheck
    description: Repo typechecks after rename.
  - id: tests-green
    cmd: test -f packages/core/src/executor/seed-executor.ts && pnpm -r test
    description: All tests pass.
  - id: no-wbs-in-packages
    cmd: test -f packages/core/src/executor/seed-executor.ts && ! grep -rq 'wbs-executor\\|WbsContext\\|WbsFn\\|TaskMdWbs' packages/core/src/ packages/cli/src/
    description: No WBS type/file names remain in source.
  - id: no-wbs-frontmatter
    cmd: |
      ! grep -rlE '^wbs:' .converge/playbooks/ examples/ 2>/dev/null
    description: No live playbook uses wbs frontmatter.
  - id: no-wbs-directories
    cmd: |
      ! find .converge/playbooks/ examples/ -type d -name wbs 2>/dev/null | grep -q .
    description: No wbs directories remain in live playbooks.
  - id: every-playbook-compiles
    cmd: |
      test -f packages/core/src/executor/seed-executor.ts && while IFS= read -r path; do
        node packages/cli/dist/index.js compile --dir "$path" || exit 1
      done < <(jq -r '.[] | select(.live == true) | .path' .converge/playbooks/dbt-paradigm/playbooks-catalog.json)
    description: Every live playbook compiles after migration.

skills: []
references:
  - ".converge/playbooks/dbt-paradigm/wbs-inventory.md"

vars: {}
dependencies:
  - 01-survey-and-catalog
---

# 02 — Rename WBS to seeds

Same API, new names. The executor logic, spawn targets, template system,
journal output, and child discovery all stay the same.

## Seeds API

A task's `seeds:` field is an array. Each entry is one of two forms:

**Inline seed** (same shape as current `wbs:`):
```yaml
seeds:
  - type: nodejs
    path: seeds/per-verb.seed.js
```

**Named seed reference** (reusable across tasks):
```yaml
seeds:
  - type: seed
    name: per-verb
```

Tasks can mix both. Most tasks use one inline seed. Named seeds enable
reuse when multiple tasks share the same spawn logic.

## Children

| id | goal |
|---|---|
| `02a-rename-types-and-files` | Rename type names, interfaces, and source files |
| `02b-move-scripts-to-seeds-dir` | Move wbs/ scripts to playbook-level seeds/ directory |
| `02c-convert-frontmatter` | Convert wbs: field to seeds: references in all TASK.md files |
| `02d-update-cli-and-compile` | Update CLI flags and compile --seed to use new names |
| `02e-migrate-playbooks` | Apply 02b+02c to every live playbook per the inventory |

## Execution order

```
02a → 02b → 02c → 02d → 02e
```

02a renames the code. 02b restructures directories. 02c updates frontmatter.
02d updates CLI surface. 02e applies everything to live playbooks.

## Done when

All 6 checks pass. Zero references to "WBS" in source or playbooks.
Everything that was WBS is now seeds.
