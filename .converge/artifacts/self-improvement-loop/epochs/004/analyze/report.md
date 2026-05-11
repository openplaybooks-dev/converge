# Selection Report — Epoch 004

## Selected: escalation-duplicate-epochs

**Priority class**: lifecycle (rank 2)
**Dimension**: Correctness

The self-improvement loop's own ledgering is producing duplicate entries. `touched-files.jsonl` has 30 identical lines for epoch 003 (15 files x2), `metrics.jsonl` has two identical epoch 003 entries, and `journal.md` has two "## Epoch 003" sections. This is a data-quality bug in the verify step's append logic — likely a resume or re-run appended without checking whether entries already exist.

## Priority ladder (higher ranks checked and clean)

1. **Crashes / stalled runs**: All 8 probes pass. No crashes, no stalled runs.
2. **Lifecycle correctness** ← SELECTED. Duplicate ledger entries violate data integrity.
3. **DAG/seed determinism**: compile, DAG, seeds, and loop-seed tests all pass (134 total).
4. **Provider/runtime**: CLI and core build cleanly. No provider errors surfaced.
5. **API contract**: Risk score 3 (elevated), but no concrete breakage — deferred.
6. **Docs/DX**: Not considered while lifecycle bug exists.

## Rejected alternatives

Only one finding was produced by observation. No alternatives to reject.

## Anti-repeat check

- Epoch 1: `invalid-model-config-errors` (API) — different class
- Epoch 2: `select-parent-plus-spawned-coverage` (Determinism) — different class
- Epoch 003: `missing-output-cache-invalidation-coverage` (lifecycle/Correctness) — same priority class but different failure: cache invalidation vs. ledger deduplication

The last two epoch entries (both labeled 003) were identical — this IS the bug we're fixing. Not a repeat of prior fix work.

## Risk

Low. The fix adds guard clauses to the verify task template and patch manifest script. Existing behavior is preserved; the only change is skipping duplicate appends. No data migration needed. Rollback is a simple revert.
