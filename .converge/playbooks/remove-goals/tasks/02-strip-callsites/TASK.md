---
id: 02-strip-callsites
title: Strip goal references from every consumer module while symbols still exist
description: |
  WBS phase. Read REFS.md (produced by 01-survey-and-fence). For every file
  marked `strip`, spawn one leaf that removes the file's goal references —
  imports, type usages, function calls, dispatch entries — while keeping the
  file's own tests and the project-wide typecheck green.

  Done compiler-driven: the goal symbols (`GoalManager`, `GoalDef`,
  `goal-planner`, `goals` / `goalDefs` schema fields) still exist at this
  point. Each leaf can typecheck against the surviving definitions, then
  remove its references one by one. Phase 03 onwards deletes the symbols
  themselves.

dependencies:
  - 01-survey-and-fence

inputs:
  - ".converge/playbooks/remove-goals/REFS.md"
  - "packages/core/src/index.ts"
  - "packages/core/src/runtime/runtime.ts"
  - "packages/core/src/runtime/task-manager.ts"
  - "packages/core/src/runtime/project-manager.ts"
  - "packages/core/src/runtime/types.ts"
  - "packages/core/src/runtime/index.ts"
  - "packages/core/src/config/task-definition.ts"
  - "packages/core/src/config/validator.ts"
  - "packages/core/src/planning/progressive-decomposition/implement-wbs.ts"
  - "packages/core/src/planning/progressive-decomposition/implement-executable.ts"
  - "packages/core/src/planning/progressive-decomposition/implement-container.ts"
  - "packages/core/src/planning/progressive-decomposition/task-md-schema.ts"
  - "packages/core/src/planning/progressive-decomposition/analyze.ts"
  - "packages/core/src/planning/progressive-decomposition/index.ts"
  - "packages/core/src/planning/task-file-generator.ts"
  - "packages/core/src/planning/dynamic-planner.ts"
  - "packages/core/src/planning/types.ts"
  - "packages/core/src/converge/converge-runner.ts"
  - "packages/core/src/converge/dod-runner.ts"
  - "packages/core/src/converge/index.ts"
  - "packages/core/src/storage/types.ts"
  - "packages/core/src/task/playbook/paths.ts"
  - "packages/core/src/task/discovery/scanner.ts"
  - "packages/core/src/task/checks/types.ts"
  - "packages/core/src/task/checks/builders.ts"
  - "packages/core/src/task/lifecycle/loop-detector.ts"
  - "packages/cli/src/main.ts"
  - "packages/cli/src/commands.ts"
  - "packages/cli/src/help.ts"
  - "packages/cli/src/skills/SKILL_README.md"
  - "packages/navigator/tests/navigator.test.ts"
  - "packages/core/tests/integration/autonomous-pentest-layout.test.ts"
  - "packages/core/tests/integration/wbs-debug-artifacts.test.ts"

outputs:
  # WBS spawns children at runtime; their TASK.md files become outputs.
  # The phase's contractual output is "all listed files contain no
  # word-boundary `goal` token after this phase," verified by checks below.

checks:
  - id: typecheck-green
    cmd: test -f package.json && pnpm --filter @converge/core --filter @converge/navigator typecheck
    description: Typecheck green for affected packages after every callsite is stripped.
  - id: tests-green
    cmd: test -f package.json && pnpm --filter @converge/navigator test
    description: Navigator tests pass after the strip (core has pre-existing test infra failures).
  - id: no-bare-goal-token-in-callsites
    cmd: |
      # No word-boundary `goal` token in the listed callsite files.
      # Excludes: the four files scheduled for total deletion in 03-05
      # (commands-goals, goal-manager, goal-planner, parse-goal).
      # Also excludes: runtime/types.ts, config/task-definition.ts,
      # task/checks/types.ts — they define GoalManager / goals / spawnGoal
      # interfaces the goal subsystem still needs (phases 03-04).
      hits=$(grep -rEn '\bgoal[A-Za-z]*\b' \
        packages/core/src/index.ts \
        packages/core/src/runtime/{runtime,task-manager,project-manager,index}.ts \
        packages/core/src/config/validator.ts \
        packages/core/src/planning/progressive-decomposition/*.ts \
        packages/core/src/planning/{task-file-generator,dynamic-planner,types}.ts \
        packages/core/src/converge/{converge-runner,dod-runner,index}.ts \
        packages/core/src/storage/types.ts \
        packages/core/src/task/playbook/paths.ts \
        packages/core/src/task/discovery/scanner.ts \
        packages/core/src/task/checks/builders.ts \
        packages/core/src/task/lifecycle/loop-detector.ts \
        packages/core/src/validation/rules/project.ts \
        packages/cli/src/{main,commands,help}.ts \
        packages/navigator/tests/navigator.test.ts \
        packages/core/tests/integration/{autonomous-pentest-layout,wbs-debug-artifacts}.test.ts \
        2>/dev/null || true)
      test -z "$hits" || { echo "$hits"; exit 1; }
    description: No word-boundary `goal` references remain in any callsite module.

wbs:
  script: wbs/index.js

tags:
  - phase
  - strip
  - wbs
---

# Phase 02 — Strip Callsites

## Scope

WBS-spawned cleanup. The phase has no fixed children — it reads REFS.md (from phase 01) and spawns one `01-red / 02-green` pair per `strip` source file.

The four files scheduled for total deletion in phases 03–05 (`commands-goals.ts`, `goal-manager.ts`, `goal-planner.ts`, `parse-goal.ts`) are **not** stripped here — they get deleted as units later. This phase only touches *consumer* modules that import or reference the goal subsystem.

The schema file (`task-md-definition.ts`) is also not stripped here — its goal fields are removed in Phase 03 in one coordinated edit (interface + serializer + aliases all together).

## Why "strip while symbols still exist"

The goal symbols (`GoalManager`, `GoalDef`, `goalsApi`, etc.) are alive at the start of this phase. That means each per-file leaf can:

1. Run typecheck and see the symbol references in *its* file.
2. Delete those references one by one.
3. Re-run typecheck against the file's module — green confirms no other consumer (in the same module) silently broke.
4. Run `pnpm -r typecheck` for the cross-module gate.

If we deleted `goal-manager.ts` first, ~15 files would simultaneously red-line, and the per-leaf gate becomes "everything is broken; fix it all" — not the intended TDD shape.

## TDD discipline

Per leaf:
- **`01-red/`**: a vitest file under `packages/<pkg>/tests/no-goals/` (or similar) asserting `expect(readFileSync('<target>')).not.toMatch(/\bgoal[A-Za-z]*\b/)`. Fails today.
- **`02-green/`**: edit the target file to remove goal references (imports, type annotations, function calls, dispatch entries, dead code paths) until the test passes AND `pnpm -r typecheck` stays green.

After the phase, the negative tests are the regression suite that prevents readmission.

## WBS contract

`wbs/index.js` reads REFS.md, parses the table, filters to `strip` rows in `packages/`, and emits one child per row with vars `{ targetFile, packageName }`. The template at `wbs/templates/per-module/` materializes `01-red/TASK.md` and `02-green/TASK.md`.

The per-layer planner writes `wbs/index.js` and the template at planning time — this TASK.md only declares the contract; the script implementation is the planner's job.

## References

- REFS.md (produced by phase 01) — the work list.
- `/Users/minh/Documents/converge/.converge/playbooks/cli-redesign/tasks/03-execution-verbs/wbs/` — WBS structure to mirror.

## Out of scope

- Deleting any of the four core goal files. That's phases 03–05.
- Removing the schema fields from `task-md-definition.ts`. That's phase 03-01.
- Anything in `docs/`. That's phase 06.

## Open questions for the per-layer planner

- Parameterized vs per-file negative test: a single `tests/no-goals.test.ts` with `describe.each` covering all stripped files might be cleaner than ~22 separate `01-red` files. Trade-off: per-file leaves preserve the WBS shape and per-file commit history; parameterized makes the regression suite tighter. Default: per-file leaves during this phase, then consolidate in phase 06.
- For files where the goal reference is a single import line (cheapest case), is the `01-red/02-green` ceremony worth it? Default: yes, for uniformity. The ceremony is ~5 lines per leaf.
