---
id: 01-survey-and-fence
title: Survey every `goal` reference, delete example GOAL.md sets, baseline green
description: |
  Establish a known-good starting point for the deletion. Three deliverables:

  (1) An inventory file `REFS.md` mapping every `goal` token in the codebase
      to a disposition: {keep, delete, strip}. "Keep" is rare — only
      tombstone tests and acknowledged historical doc mentions. Everything
      else is "delete" (whole file goes) or "strip" (file stays, references
      removed).
  (2) Deletion of all `GOAL.md` artifacts under `examples/` (30 files across
      3 workspaces: baby-app, stitch-to-flutter-baby-watch,
      evolutionary-optimization). No translation to `checks:` — the
      examples already have task-level checks; the GOAL.md set was a
      parallel mechanism that becomes irrelevant once the goal concept is
      gone.
  (3) Quarantine of goal-specific test files (those whose entire purpose is
      exercising the goal subsystem). Mark them skipped with a comment
      pointing at this playbook; they get deleted in phases 03–05 alongside
      the code they test.

  After this phase, `pnpm -r typecheck && pnpm -r test` is green and the
  remaining phases have a clean baseline to delete from.

inputs:
  - "packages/cli/src/commands-goals.ts"
  - "packages/core/src/runtime/goal-manager.ts"
  - "packages/core/src/converge/goal-planner.ts"
  - "packages/core/src/config/parse-goal.ts"
  - "packages/core/src/config/task-md-definition.ts"

outputs:
  - ".converge/playbooks/remove-goals/REFS.md"

checks:
  - id: refs-md-exists
    cmd: test -s .converge/playbooks/remove-goals/REFS.md
    description: REFS.md exists and is non-empty.
  - id: refs-md-covers-source
    cmd: |
      # Every file with a `\bgoal\b` token in packages/ must appear in REFS.md.
      missing=0
      for f in $(grep -rlE '\bgoal[A-Za-z]*\b' packages/ --exclude-dir=node_modules 2>/dev/null); do
        grep -qF "$f" .converge/playbooks/remove-goals/REFS.md || { echo "missing from REFS.md: $f"; missing=1; }
      done
      test $missing -eq 0
    description: Every source file containing a `goal` word-boundary token is listed in REFS.md.
  - id: example-goal-mds-deleted
    cmd: test -d examples && ! find examples -name GOAL.md 2>/dev/null | grep -q .
    description: No GOAL.md artifacts remain under examples/.
  - id: example-goals-dirs-deleted
    cmd: test -d examples && ! find examples -type d -name goals 2>/dev/null | grep -q .
    description: The .converge/playbooks/*/goals/ directories under examples/ are gone.
  - type: test
    name: typecheck
    args:
      pnpm_args: "-r --filter '!@converge/studio' --filter '!@converge/provider-benchmark'"
      guard: "test -f package.json && "
    description: Typecheck still green after example cleanup and test quarantining.
  - type: test
    name: tests-green
    args:
      pnpm_args: "-r --filter '@converge/cli'"
      guard: "test -f package.json && "
    description: Test suite still green (quarantined goal-specific tests are skipped, not failing).

tags:
  - phase
  - survey
  - examples
---

# Phase 01 — Survey and Fence

## Scope

Three deliverables:

### 1. `REFS.md` — the inventory

A markdown table at `.converge/playbooks/remove-goals/REFS.md` listing every file in the codebase that contains a `\bgoal\b` word-boundary token, with one of three dispositions:

| Disposition | Meaning | Examples |
|---|---|---|
| `delete` | The whole file is going away. | `commands-goals.ts`, `goal-manager.ts`, `goal-planner.ts`, `parse-goal.ts`, `docs/reference/cli/goals.md` |
| `strip` | File stays; goal references get removed. | `main.ts` (one dispatch case), `task-md-definition.ts` (schema fields), `runtime.ts` (one import) |
| `keep` | Reference is acknowledged historical or tombstone. | `docs/design/cli-redesign.md` migration table; the future `tests/no-goals.test.ts` |

REFS.md is the source of truth that phases 02–06 consume. Phase 02's WBS reads it to spawn one leaf per `strip` file in source. Phase 06's WBS reads it for `strip` files in docs.

### 2. Delete example GOAL.md sets

Three workspaces have `.converge/playbooks/*/goals/` directories with GOAL.md files:
- `examples/baby-app/.converge/playbooks/default/` (7 files)
- `examples/stitch-to-flutter-baby-watch/.converge/playbooks/default/`
- `examples/evolutionary-optimization/.converge/playbooks/goals/`

`rm -rf` each `goals/` directory. Do not translate to `checks:` on existing tasks — the examples already have their own task-level `checks:` blocks. After deletion, run each example's typecheck/test (where applicable) to confirm nothing in the example references the deleted GOAL.md files.

### 3. Quarantine goal-specific tests

Some test files exist *solely* to exercise goal-subsystem behavior (likely in `packages/core/tests/`). Mark each with `.skip` (vitest) or rename to `.skip.test.ts`, with a one-line comment pointing at this playbook. They get deleted alongside the code they test in phases 03–05.

Do **not** quarantine tests that incidentally mention `goal` (e.g. `navigator.test.ts` — those are touched in phase 02). The diagnostic: if removing the test file's coverage in phase 02–05 wouldn't reduce coverage for non-goal code paths, it's a quarantine candidate.

## TDD discipline

This phase is mostly inventory and deletion. The `01-red/02-green` shape applies to (3) — write a test that asserts the quarantined files are skipped (`expect(testRunResults.skipped).toContain('foo.test.ts')`), then perform the skip. For (1) and (2), the checks above (refs-md-covers-source, example-goal-mds-deleted) are themselves the acceptance test — no separate red-green shape needed.

## References

- `/Users/minh/Documents/converge/.converge/playbooks/cli-redesign/playbook.yml` — style template.
- `/Users/minh/Documents/converge/.converge/playbooks/cli-redesign/tasks/01-foundations/TASK.md` — first-phase TASK.md template.
- `find /Users/minh/Documents/converge/examples -name GOAL.md` — current artifact set.

## Out of scope

- Translating GOAL.md content into `checks:`. Decision: drop, don't translate.
- Updating example READMEs to remove "see GOALS" sections. Phase 06 handles doc prose.
- Editing `docs/design/cli-redesign.md` migration table. That table is a historical snapshot; it stays as-is.

## Open questions for the per-layer planner

- One `01-red` leaf per quarantined test file, or one parameterized leaf? Default: one parameterized leaf — quarantining is a uniform mechanical edit.
- Whether to also produce a `target/refs.json` machine-readable form alongside `REFS.md`. Default: no, keep one source of truth (markdown). Phase 02's WBS can parse the markdown table.
