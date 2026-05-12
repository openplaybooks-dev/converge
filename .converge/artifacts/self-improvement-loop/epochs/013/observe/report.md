# Epoch 013 Observation Report

## Build

| Target | Result |
|--------|--------|
| `@converge/cli` | pass (4.3s) |
| `@converge/core` | pass (8.7s) |

Both produce unused-import tree-shaking warnings (non-blocking).

## Tests

| File | Tests | Result |
|------|-------|--------|
| `tests/playbook-compile.test.ts` | 104 | pass (6.6s) |
| `tests/playbook-dag.test.ts` | 16 | pass (1.9s) |
| `tests/playbook-seeds.test.ts` | 13 | pass (10ms) |
| `tests/playbook-loop-seed.test.ts` | 1 | pass (2.8s) |
| `tests/playbook-run-lock.test.ts` | 2 | pass (660ms) |

**Total: 136 tests, 0 failures.**

## CLI

- `--help`: clean output with all documented commands and flags.
- `--dry`: 9-node DAG resolves correctly; 8 tasks would execute, 1 skipped.
- `--select epoch-013+`: returns "No tasks match selection" — the `+` operator with an epoch prefix may not resolve as expected.

## Maintainer Probe: `--select parent+` includes dynamically spawned descendants

No dedicated test exists for this operator. The `playbook-loop-seed.test.ts` uses `--select improve+` but targets a statically-known task name. The `codex-real-runner.test.ts` uses `--select=hello` and `--select=skill-load` (plain task names, no `+` operator). No test verifies that a `parent+` selection picks up dynamically spawned child tasks — a gap in DAG determinism coverage.

## Surprising Behavior

1. `run.mode is deprecated and ignored` fires 13 times during `--dry` (once per task node plus some repetition). The deprecation message is repeated verbatim per-task instead of being de-duplicated.
2. Warnings for playbooks lacking tasks/: `smoke-test`, `test-progress-curl`, `test-progress-fresh`. These clutter output during normal operation.
3. No ledger files exist at `.converge/artifacts/self-improvement-loop/` (no `journal.md`, `metrics.jsonl`, `backlog.jsonl`, or `touched-files.jsonl`). Prior epochs may not have been recording persistent metrics.

## Verdict

All required probes pass. The highest-value maintainer-grade finding is the missing regression test for `--select parent+` descendant inclusion (rank 3, DAG determinism).
