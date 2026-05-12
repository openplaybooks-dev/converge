# Selection Report — Epoch 021

## Selected: select-parent-plus-spawned-coverage-recurrence

**Selection rank:** 2 (determinism)
**Priority class:** determinism
**Risk:** medium

## Maintainer rationale

`tests/playbook-dag.test.ts` has failed the same assertion (line 257: `--select parent+` missing spawned child in journal) across epochs 13, 19, and 20. Per maintainer policy, a file appearing in 3+ epochs requires a root-cause refactor, not another incremental patch. Prior epochs approached this incrementally (test coverage in 13, compile fix in 19, escalation in 20) without fixing the underlying spawn-materialization gap.

## Evidence

- **Failing test:** `tests/playbook-dag.test.ts:257` — `expected child-alpha TASK.md to exist in journal after --select parent+ but got false`
- **Reproduction command:** `pnpm vitest run tests/playbook-dag.test.ts` — consistently fails
- **File history:** `tests/playbook-dag.test.ts` in epochs 13, 19, 20 (3+ epochs → root-cause policy)
- **Dry-run confirmation:** 21-node DAG with spawn tasks exists, but select operator returns empty

## Rejected alternatives

| Finding | Reason |
|---|---|
| hooks-throw-timeout-recurrence | Files overlap with epoch 20 (same file, same test) — anti-repeat; separate correctness bug, not a 3+ epoch hot-file |
| escalate-no-actionable-findings | Repeat of epoch 20 escalation — anti-repeat on same ID; a root-cause fix is now justified by the 3+ epoch hot-file rule |

## Higher-priority check

1. **Failing test/crash:** hooks timeout is a separate correctness bug, not a determinism issue. Blocked by anti-repeat (same file as epoch 20).
2. **State/lifecycle correctness:** Clean.
3. **DAG/seed determinism:** This is the selected target — highest actionable priority.
4. **Provider/runtime:** Clean.
5. **API contract:** Clean.
6. **Docs/DX:** Not applicable.

## Test strategy

Add a failing regression that pinpoints the spawn-materialization gap, then fix the root cause in `packages/core/src/run.ts`. Verify with existing `playbook-compile` and `playbook-dag` suites.
