---
title: "Convert wbs frontmatter to seeds array in all TASK.md files"
description: |
  Replace the single wbs: config with a seeds: array. Each entry is either
  an inline seed (same shape as current WBS) or a named seed reference
  pointing at a reusable seeds/<name>.seed.js file.

inputs:
  - .converge/playbooks/dbt-paradigm/wbs-inventory.md
  - packages/core/src/config/task-md-definition.ts

outputs:
  - packages/core/src/config/task-md-definition.ts
  - .converge/playbooks
  - examples

checks:
  - id: no-wbs-frontmatter
    cmd: |
      ! grep -rlE --include='*.md' '^wbs:' .converge/playbooks/ examples/ 2>/dev/null
    description: "No TASK.md uses wbs frontmatter."
  - id: seeds-field-parses
    cmd: test -f packages/core/src/config/task-md-definition.ts && pnpm --filter @converge/core test -- task-md
    description: "seeds field parses both inline and named forms."
  - id: typecheck-green
    cmd: test -f packages/core/src/config/task-md-definition.ts && pnpm --filter @converge/core typecheck
    description: Core typechecks after schema change.

skills: []
references:
  - "packages/core/src/config/task-md-definition.ts"

vars: {}
dependencies:
  - 02b-move-scripts-to-seeds-dir
---

# 02c — Convert frontmatter to seeds array

## New schema

Replace the single `wbs:` object with a `seeds:` array. Each entry is one of:

### Form 1 — Inline seed (same as current WBS)

```yaml
seeds:
  - type: nodejs           # "nodejs" | "shell" | "ai"
    path: seeds/per-verb.seed.js
    args: ["--count=5"]
    env:
      DEBUG: "1"
    after: true             # run after task executor (for epoch-style spawns)
```

Same fields as `TaskMdWbs` today: `type`, `path`, `prompt`, `maxAttempts`,
`args`, `env`, `after`. Just in an array under `seeds:` instead of a single
object under `wbs:`.

### Form 2 — Named seed reference

```yaml
seeds:
  - type: seed
    name: per-verb          # resolves to seeds/per-verb.seed.js
```

References a reusable seed file. The seed file contains the script that
was previously inlined via `wbs.path`.

### Mixed — multiple seeds per task

```yaml
seeds:
  - type: seed
    name: shared-setup       # reusable context seed
  - type: nodejs
    path: seeds/per-verb.seed.js  # task-specific spawning seed
```

A task can have multiple seeds. They run in order. Context seeds produce
inputs for the task; spawning seeds materialize children.

## Schema type

```typescript
type SeedRef =
  | { type: "nodejs" | "shell" | "ai"; path?: string; prompt?: string; args?: string[]; env?: Record<string,string>; after?: boolean; maxAttempts?: number }
  | { type: "seed"; name: string };

interface TaskMdDef {
  seeds?: SeedRef[];  // replaces wbs?: TaskMdWbs
}
```

## Red phase

Write tests:
- Parse `seeds:` with one inline nodejs entry → asserts SeedFn created
- Parse `seeds:` with one named seed reference → asserts resolves to file
- Parse `seeds:` with both forms mixed → asserts two SeedFns
- Parse `wbs:` → throws "unknown field"

## Green phase

1. Remove `wbs?: TaskMdWbs` from `TaskMdDef` and `TaskMdShape`.
2. Add `seeds?: SeedRef[]`.
3. `mapTaskMdToTaskDefinition()`: for each entry, create a `SeedFn` —
   inline entries use the same logic as current WBS (call `createScriptSeedFn`
   / `createAiSeedFn`), named entries resolve the file from `seeds/<name>.seed.js`
   then call the same factory.
4. For every TASK.md in the inventory, convert `wbs:` to `seeds:`.

## Incremental context → spawn

If a task is incremental, a named seed can be re-run on each iteration.
The runtime runs context seeds first (producing inputs), then runs the
task body, then runs spawning seeds (materializing children for the next
iteration). Same as current WBS with `after: true`, just expressed as
two separate seed entries.

## Done when

All 3 checks pass. `seeds:` accepts both inline and named forms. Multiple
seeds per task work.
