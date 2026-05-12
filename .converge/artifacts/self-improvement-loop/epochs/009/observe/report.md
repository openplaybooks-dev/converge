# Epoch 9 Observation Report

## Build

- `pnpm --filter @converge/cli build` — **pass** (4.39 MB, 4847ms)
- `pnpm --filter @converge/core build` — **pass** (14 entries, 7731ms)

Unused-import warnings emitted by tsup for both packages (fs, fs/promises, yaml, path). Not a correctness issue.

## Test inventory

```
tests/claudefn-timeout.test.ts
tests/cli-help.test.ts
tests/codex-backend.test.ts
tests/codex-real.test.ts
tests/codex-real-runner.test.ts
tests/compile-discover.test.ts
tests/deepcode-backend.test.ts
tests/deepseek-opencode.test.ts
tests/mixed-model.test.ts
tests/no-goals.test.ts
tests/playbook-compile.test.ts
tests/playbook-dag.test.ts
tests/playbook-hooks.test.ts
tests/playbook-loop-seed.test.ts
tests/playbook-run-lock.test.ts
tests/playbook-seeds.test.ts
```

## Root-level tests

Root `vitest.config.ts` requires vitest as a root dependency, but vitest is not installed at workspace root. `pnpm exec vitest` fails with `ERR_MODULE_NOT_FOUND` for the `vitest` package. This blocks all root-level test execution.

## Core package tests (run from packages/core)

```
npx vitest run tests/unit
```

### Failed: `tests/unit/journal/structure.test.ts` — 23 of 28 failed
- Nested task path routing, attempt dir creation, and ancestor resolution all fail
- Path structures involving `tasks/` wrapping and multi-level nesting are broken

### Failed: `tests/unit/manifest/run-state-manager.test.ts` — 17 of 18 failed
- Node initialization, status transitions, persistence, and metadata all fail
- Only `getNodeStatus returns undefined for unknown node` passed
- Likely a data-model or import mismatch introduced recently

### Failed: `tests/unit/validation/structure-rules.test.ts` — 1 of 21 failed
- `passes with path inside project` failed (11ms) — route boundary check

### Failed: `tests/unit/buggy-check-relaxer.test.ts` — 4 of 10 failed
- Proposal apply/reject/rewrite logic partially broken

### Passed: `tests/unit/executor/task-executor.test.ts` — all passed
### Passed: `tests/unit/executor/loop-executor.test.ts` — all passed (20s+ looping tests)

Total: ~45 test failures across 4 files in core package unit tests.

## CLI help

`node packages/cli/dist/index.js --help` — **pass**. Output is well-structured with EXECUTE, INSPECT, MANAGE, SELECTION FLAGS, GLOBAL OPTIONS, and EXAMPLES sections.

## Ledgers

All present: `journal.md`, `metrics.jsonl`, `backlog.jsonl`, `touched-files.jsonl`.

## Maintainer probe: stale manifest behavior

Not probed — the test failures above are higher-priority (Rank 1: failing tests) and the root-level test infrastructure is blocked by a missing root dependency. The core test failures in `run-state-manager` and `journal/structure` are the most impactful finding: they indicate fundamental state/structure correctness regressions.

## Selection

**Highest-ranked candidate**: Core test failures in `run-state-manager.test.ts` and `journal/structure.test.ts` are Rank 1 (failing tests, reproducible failure). These are framework-level correctness issues in the state management and journal path routing layers. Fix the root cause that introduced these 40+ failures.
