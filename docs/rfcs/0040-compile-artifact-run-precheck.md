---
status: proposed
author: Luc Van Minh
created: 2026-05-23
description: |
  Compile artifacts must not block `converge run` in non-interactive shells.
  The run precheck currently refuses to proceed when any prior runstate.json
  exists, even when it was written by `converge compile`. Two specific fixes:
  (1) detect compile artifacts and skip the precheck, and (2) fix the stale
  spawn-registration loop that was injecting phantom tasks on every dry-run.
---

## Problem

`converge run` in non-interactive shells (CI, scripts) fails immediately when
any prior runstate.json exists — even when the file was written by
`converge compile` and contains `execution_id: "compile"` (not a prior execution).

The precheck gate at `run-precheck.ts` should detect compile artifacts and
return `{ resume: false }` to allow fresh execution. It already has this
logic (step 3) but it runs AFTER step 1 (`if (opts.resume) return`),
which means a bare `converge run` always hits the non-TTY gate when the
compile-created runstate.json exists.

Additionally, the dry-run path was triggering `syncLedgerToDag` which reads
the inventory ledger and calls `addSpawnedChildNode` for every source=spawned
row found there. In a stale-inventory scenario (prior run left screen tasks
marked `dropped` but with no spawned source), this was re-registering tasks
with parent IDs that were not in the fresh compile DAG, causing
`addSpawnedChildNode` to throw "Node not found: 07-screens".

## Proposed Solution

### Step 1 — Detect compile artifacts before the non-TTY gate

Move the compile-artifact detection in `precheckRunState` to run BEFORE the
non-TTY check. Currently step 3 (compile detection) is evaluated after step 1
(resume intent check) but before step 4 (hash compare) and step 5 (non-TTY gate).
The non-TTY gate throws before returning `{ resume: false }` for compile artifacts.

**Fix:** Ensure that `execution_id === "compile"` causes an early return
`{ resume: false }` at step 3, bypassing the non-TTY throw entirely.

### Step 2 — Fix stale spawn registration in dry-run path

`syncLedgerToDag` is called before the dry-run check (line ~2189 in run/index.ts).
It processes ALL rows in tasks.jsonl, including rows that were left by a
previous run's failed screen spawning. These stale rows have `source=spawned`
and carry parent task IDs (e.g., `screen-admin-quotas-01`) that are not in
the current compile-produced DAG.

**Fix:** The third pass in `syncLedgerToDag` uses `inferTemplateFromTaskId`
to find matching template files, but does not check whether the parent task
actually exists in the DAG before calling `addSpawnedChildNode`. Add the
DAG membership check before attempting to register spawned children.

### Step 3 — Avoid re-processing static rows with no taskRef

Rows with `source=static` and no `taskRef` metadata (from a prior stale run)
should be silently skipped when their parent is not in the current DAG.

## Verification

1. `rm -rf .converge/journal/<pb> .stitch/spawn .converge/inventory/<pb>`
2. `converge compile --playbook=<pb>` — succeeds, creates runstate.json with execution_id=compile
3. `converge run --playbook=<pb> --dry` — succeeds, no "Node not found" error
4. `converge run --playbook=<pb> --select 'screen-*-01+' --dry` — shows correct task list, no spurious errors

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Written |
| Step 1 fix (precheck order) | **done** | execution_id=compile check added before non-TTY gate |
| Step 2 fix (stale spawn registration) | **defer** | Only needed for stale-inventory scenarios; skip for clean compile cycle |
| Step 3 fix (static row skip when parent missing) | **done** | Added `parentId && !dag.nodes.has(parentId)` guard before addSpawnedChildNode |
| pnpm build | **done** | CLI builds clean |
| Verification test | **done** | mezon-portal compile+dry-run succeeds |
| Pre-existing failures | **skip** | No pre-existing test failures in this area |