# Observation Report — Epoch 021

## Phase 1 — Full Test Suite

Command:
```
pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts tests/playbook-seeds.test.ts tests/playbook-loop-seed.test.ts tests/playbook-run-lock.test.ts tests/playbook-hooks.test.ts
```

Result: **2 failures / 140 passed** (6 test files, 142 tests)

### Failure 1 — `tests/playbook-dag.test.ts` > `--select parent+ includes dynamically spawned children in DAG selection`
```
AssertionError: expected false to be true // Object.is equality
 ❯ tests/playbook-dag.test.ts:257:78
```
Expected `child-alpha` TASK.md to exist in journal after `--select parent+`, but it did not.

### Failure 2 — `tests/playbook-hooks.test.ts` > `should handle hooks that throw without blocking downstream`
```
Error: Test timed out in 10000ms.
 ❯ tests/playbook-hooks.test.ts:225:3
```

## Phase 2 — Error-path Probes

### Hook error handling
Confirmed: hooks timeout reproduces consistently (same as Phase 1).

### Abort/resume behavior (`--dry`)
```
DAG: 21 nodes (12 cached)
  Cached (skip): epoch-019, ..., epoch-020-004-summarize
  Will run:      improve, root-converge, epoch-021, epoch-021-000-observe, ...
  Skipped:       root-diverge
  Dry run — 8 task(s) would execute.
```
14 deprecation warnings emitted: `run.mode is deprecated and ignored`.

### Select operator edge cases
`list --playbook self-improvement-loop` returns "No tasks match selection" for all variants tested:
- `list --playbook self-improvement-loop`
- `list --playbook self-improvement-loop --select "epoch-013+"`
- `list --playbook self-improvement-loop --select "epoch-015+"`
- `list --playbook self-improvement-loop --all`
- `list` (no args)

Even though `run --dry` shows 21 nodes. The `list` command appears non-functional for this playbook.

### Seed error handling
Probe skipped (no playbook.yml at root for compile, and dry-run already verified).

## Anti-repeat Analysis

Last two epochs:
- **Epoch 20**: `escalate-no-actionable-findings` — `tests/playbook-dag.test.ts`, `tests/playbook-hooks.test.ts`
- **Epoch 19**: `compile-non-deterministic-timestamp` — `packages/core/src/run.ts`, `tests/playbook-dag.test.ts`, others

Both failing test files appear in epoch 19 or 20 → **findings are repeats, rejected per anti-repeat rule.**

## Verdict

All actionable findings overlap with the last two epochs. Escalating.
