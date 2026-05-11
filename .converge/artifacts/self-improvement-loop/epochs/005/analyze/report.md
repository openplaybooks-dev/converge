# Selection Report — Epoch 5

## Selected: runstate-missing-crash

**Priority class**: lifecycle (rank 1)
**Dimension**: Correctness

run() crashes when runstate.json is missing and dry:true is set. The failing test in tests/playbook-run-lock.test.ts reproduces this: deleting runstate.json after a successful run, then re-running with dry:true throws ENOENT.

## Rejected alternatives

None. Only one finding was observed: `runstate-missing-crash`. All probes were run and only the run-lock test suite had a failure.

## Maintainer rationale

This is the highest-priority finding (rank 1, high severity). It's a real crash in a lifecycle code path — not a cosmetic or DX change. Epoch 4 was cosmetic (duplicate epoch entries in the ledger), so selecting a real correctness fix now avoids two consecutive cosmetic epochs. The fix is small and reviewable: guard the runstate read path in `packages/core/src/run.ts` when dry:true so a missing runstate is treated as all-pending.

The same dimension (Correctness) appeared in epochs 003 and 4, but the bug class is distinct: epoch 003 addressed cache invalidation when declared outputs are missing, while this epoch addresses a crash when runstate itself is missing in dry mode — a different code path and failure mode.

An existing regression test already covers the fix target (`tests/playbook-run-lock.test.ts`), so the test_strategy is "run existing coverage."
