---
title: Two-pass deletion — WBS API (pass A), then dod/legacy modules (pass B)
description: |
  No live playbook uses WBS anymore (phase 05 migrated them). Delete the
  WBS API, then delete the dod/legacy modules catalogued in phase 01's
  REFS.md. Inverted red-green at every leaf — write a negative-existence
  test, delete until it passes, leave the test as a tombstone.

inputs:
  - .converge/playbooks/dbt-paradigm/REFS.md
  - .converge/playbooks/dbt-paradigm/migration-report.md
  - packages/core/src/executor/wbs-executor.ts
  - packages/core/src/executor/wbs-target-utils.ts
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/runtime/child-synthesizer.ts

outputs:
  - packages/core
  - packages/cli
  - packages/core/tests/no-legacy-api.test.ts

checks:
  - id: typecheck-green
    cmd: pnpm -r typecheck
    description: All packages typecheck after deletion.
  - id: tests-green
    cmd: pnpm -r test
    description: All test suites pass.
  - id: built-cli-exists
    cmd: test -x packages/cli/dist/index.js
    description: The CLI builds end-to-end after legacy deletion.
  - id: wbs-executor-deleted
    cmd: "! test -f packages/core/src/executor/wbs-executor.ts"
    description: WBS executor module is gone.
  - id: wbs-target-utils-deleted
    cmd: "! test -f packages/core/src/executor/wbs-target-utils.ts"
    description: WBS target utils module is gone.
  - id: no-wbs-frontmatter-field
    cmd: "! grep -nE '^\\s*wbs[?]?:' packages/core/src/config/task-md-definition.ts"
    description: Schema no longer carries the wbs: frontmatter field.
  - id: dod-runner-deleted
    cmd: "! test -f packages/core/src/converge/dod-runner.ts"
    description: dod-runner.ts gone.
  - id: gap-ledger-deleted
    cmd: "! test -f packages/core/src/converge/gap-ledger.ts"
    description: gap-ledger.ts gone.
  - id: backlog-bridge-deleted
    cmd: "! test -f packages/core/src/converge/backlog-bridge.ts"
    description: backlog-bridge.ts gone.
  - id: weights-deleted
    cmd: "! test -f packages/core/src/converge/weights.ts"
    description: weights.ts gone.
  - id: fabrication-scanner-deleted
    cmd: "! test -f packages/cli/src/fabrication-scanner.ts"
    description: fabrication-scanner.ts gone.
  - id: commands-backlog-deleted
    cmd: "! test -f packages/cli/src/commands-backlog.ts"
    description: commands-backlog.ts gone.
  - id: autonomous-run-deleted
    cmd: "! test -f packages/cli/src/autonomous-run.ts"
    description: autonomous-run.ts gone (its functions absorbed by commands-run.ts).
  - id: tombstone-test-present
    cmd: test -s packages/core/tests/no-legacy-api.test.ts
    description: Consolidated tombstone test exists.

skills: []
references:
  - ".converge/playbooks/dbt-paradigm/REFS.md"
  - ".converge/playbooks/dbt-paradigm/migration-report.md"

vars: {}
dependencies:
  - 05-migrate-playbooks
---

# 04 — Strip legacy

This phase runs **after** phase 05 (per the depends_on graph). Phase 05
migrated every live playbook off WBS, so the executor is now safe to
delete.

Two passes. Inverted red-green at every leaf:

1. Write a negative-existence test (`expect(fs.existsSync(...)).toBe(false)`,
   `expect(parseTaskMd('wbs:\n  ...')).toThrow(/unknown field/)`, etc.).
2. Run it — must be RED.
3. Delete the file or strip the symbol until GREEN.
4. Leave the test as a tombstone.

Per-leaf `pnpm -r typecheck && pnpm -r test` must stay green.

## Pass A — WBS API

Delete in this order to keep typecheck green at each step:

1. **Strip the `wbs:` frontmatter field** from
   `packages/core/src/config/task-md-definition.ts`. Any task still
   carrying it parses as having an unknown field. (No live playbook has
   it after phase 05; the only failures here would be archived playbooks
   we choose to skip.)
2. **Strip `wbs:`-keyed manifest paths** from the manifest writer. A
   parent's `state` is now driven only by `seeds:`.
3. **Delete `packages/core/src/executor/wbs-executor.ts`**. Imports
   should be gone after step 1; if any remain, they're orphans — strip
   them.
4. **Delete `packages/core/src/executor/wbs-target-utils.ts`**. Verify
   `child-synthesizer.ts` (extracted in phase 03) does not import from
   it; if it does, the extraction was incomplete — fix in
   child-synthesizer, not by keeping the legacy file.
5. **Strip the `wbs:` selector method** if `cli-redesign` shipped one.
   `seed:` and `frontier:` cover its use cases.

## Pass B — dod / legacy concepts

Delete each file in `REFS.md` Pass B. For each:

1. Strip callsites first (each callsite gets its own red-green pair, or
   a small WBS fan-out if the count is large). Imports become orphans;
   strip them.
2. Once the file has no incoming references, delete it.

Required deletions (verify each in `REFS.md` is actually legacy before
deleting — `synthesis/` may include load-bearing non-dod code):

- `packages/core/src/converge/dod-runner.ts`
- `packages/core/src/converge/gap-ledger.ts`
- `packages/core/src/converge/backlog-bridge.ts`
- `packages/core/src/converge/weights.ts`
- `packages/cli/src/fabrication-scanner.ts`
- `packages/cli/src/commands-backlog.ts`
- `packages/cli/src/autonomous-run.ts` — move its functions to
  `commands-run.ts` first; the old file then has no incoming refs and
  deletes.
- Any `synthesis/` modules confirmed dod-tied in `REFS.md`.

## Tombstone consolidation

After both passes, write
`packages/core/tests/no-legacy-api.test.ts` consolidating the
negative-existence tests into one file. Each per-leaf tombstone test
either folds into this file or stays where it is (the planner decides
per case; consolidation is preferable for readability).

The consolidated file asserts:
- The 11 deleted file paths do not exist.
- The `wbs:` frontmatter field rejects in `parseTaskMd`.
- A task with `wbs:` set fails `loader.ts` with an unknown-field error.

## Out of scope (do not touch)

- Documentation pages (phase 06).
- Examples that are explicitly archived in
  `playbooks-catalog.json` (those keep their legacy shape as historical
  reference).

## Done when

All 14 checks above pass; `pnpm -r typecheck && pnpm -r test` is green;
`grep -rln '\\bwbs-executor\\b' packages/` returns zero matches.
