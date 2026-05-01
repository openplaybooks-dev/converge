---
id: 03-delete-schema-and-parser
title: Strip GoalDef from the schema; delete parse-goal.ts; clean validator and
  task-definition
description: |
  Phase 02 made every consumer module goal-free. Now the schema and parser
  themselves go: the `GoalDef` interface and `goals` / `goalDefs` /
  `goal-defs` aliases come out of `task-md-definition.ts`, the
  `parse-goal.ts` parser is deleted, and `validator.ts` /
  `task-definition.ts` lose their goal-aware code paths.

  After this phase, attempting to parse a TASK.md that declares `goals:` or
  `goalDefs:` raises "unknown field" — the schema explicitly rejects them.
  Phase 04 then deletes the runtime that consumed those fields.
dependencies:
  - 02-strip-callsites
inputs:
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/validator.ts
  - packages/core/src/config/task-definition.ts
outputs:
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/validator.ts
  - packages/core/src/config/task-definition.ts
checks:
  - id: typecheck-green
    cmd: test -f package.json && pnpm -r --filter './packages/core' --filter './packages/cli' --filter './packages/navigator' typecheck
    description: Typecheck green.
  - id: tests-green
    cmd: test -f package.json && pnpm -r --filter './packages/core' --filter './packages/cli' --filter './packages/navigator' test
    description: Tests pass.
  - id: parse-goal-deleted
    cmd: test -d packages/core/src/config && ! test -e
      packages/core/src/config/parse-goal.ts
    description: parse-goal.ts is gone.
  - id: goaldef-interface-gone
    cmd: test -f packages/core/src/config/task-md-definition.ts && ! grep -nE
      'interface GoalDef\b' packages/core/src/config/task-md-definition.ts
    description: The GoalDef interface declaration is removed from task-md-definition.ts.
  - id: schema-rejects-goals-field
    cmd: test -f package.json && pnpm --filter @converge/core test --
      task-md-definition.test.ts
    description: The schema test asserts that `goals:` and `goalDefs:` in a TASK.md
      are rejected as unknown fields.
  - id: no-goal-token-in-config
    cmd: >
      hits=$(grep -rEn '\bgoal[A-Za-z]*\b' packages/core/src/config/ 2>/dev/null
      || true)

      test -z "$hits" || { echo "$hits"; exit 1; }
    description: No word-boundary `goal` references remain anywhere under
      packages/core/src/config/.
tags:
  - phase
  - schema
  - delete
---

# Phase 03 — Delete Schema and Parser

## Scope

Three coordinated edits + one deletion:

### 1. `task-md-definition.ts` (one big edit)

Remove all of the following at once (they are interdependent — partial removal won't typecheck):

- The `GoalDef` interface (lines 47–67 today).
- `goals?: string[]` field (lines 133, 171).
- `goalDefs?: GoalDef[]` field (line 191).
- The `"goals"`, `"goalDefs"`, `"goal-defs"` entries in alias arrays (lines 219, 229, 230).
- The `def.goals` / `def.goalDefs` references in serialization paths (lines 476, 654, 696).
- The doc comments at lines 43–45, 186–189 that describe goal emission.

Update the unit test for the schema to assert that a TASK.md with `goals:` or `goalDefs:` frontmatter raises an "unknown field" parse error.

### 2. Delete `parse-goal.ts`

The 267-line parser used only for parsing GOAL.md files. After phase 01 deleted the example GOAL.md set and phase 02 stripped every consumer of `GoalDefinition`, nothing imports this file. Delete it; remove any orphaned re-export from `packages/core/src/config/index.ts` (already covered in phase 02, double-check here).

### 3. `validator.ts` and `task-definition.ts`

Each contains goal-aware branches (validation rules for `goals:` field; serialization helpers for `GoalDef`). Strip those branches. Update the validator's tests to remove cases that exercise goal validation paths (those tests should already be quarantined by phase 01 if they are goal-only; if mixed, prune the goal-only `it()` blocks here).

## TDD discipline

Inverted red-green at the phase level (not per file — these three files form one tight unit):

- **`01-red/`**: write `tests/no-goals/schema.test.ts` with three assertions:
  1. `parseTaskMd('---\ngoals:\n  - x\n---\n')` throws / returns an error matching `/unknown field.*goals/i`.
  2. `parseTaskMd('---\ngoalDefs:\n  - id: x\n---\n')` likewise.
  3. `import('packages/core/src/config/parse-goal')` throws `MODULE_NOT_FOUND`.

  All three fail today.

- **`02-green/`**: perform the three edits + deletion above until all three assertions pass and `pnpm -r typecheck && pnpm -r test` is green.

## References

- `/Users/minh/Documents/converge/packages/core/src/config/task-md-definition.ts` — the target file.
- REFS.md — should mark `task-md-definition.ts` as `strip` and `parse-goal.ts` as `delete`.

## Out of scope

- Deleting `goal-manager.ts` and `goal-planner.ts`. Phase 04.
- Deleting `commands-goals.ts`. Phase 05.
- Anything in `docs/`. Phase 06.

## Open questions for the per-layer planner

- Should the schema test also assert that `parse-goal.ts` is not in the published `packages/core` exports (`pnpm pack` and grep)? Default: yes if the package is publishable; otherwise the file-existence check is sufficient.


> **Note (auto-patched by repair):** Also ensure `packages/core/src/config/parse-goal.ts` is produced.
