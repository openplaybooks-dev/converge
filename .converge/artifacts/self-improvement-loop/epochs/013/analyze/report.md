# Epoch 013 Selection Report

## Selected: `no-test-select-parent-plus`

**Priority class:** determinism (rank 3) — missing regression test for `--select parent+` DAG operator with dynamically spawned descendants.

**Maintainer rationale:** The `--select parent+` operator is a critical DAG feature documented in the CLI `--help`. A bug here would silently omit dynamically spawned child tasks from a run — a determinism correctness failure that would be hard to notice without explicit coverage. The fix is a test-only addition (no production code change), making it a low-risk, high-signal patch suitable for a single-review-sitting review.

## Rejected alternatives

### `deprecation-warning-spam` — REJECTED (same failure class as epoch 11)

Epoch 11 targeted `run-mode-deprecation-warning-spam` — the exact same class of issue (deprecation warning deduplication). The maintainer policy explicitly disallows selecting the same failure class as either of the last two epochs. The underlying logger-level dedup may need a follow-up, but not as a consecutive standalone target.

## Higher-priority checks

- **Rank 1 (crash/stall):** Clean. All 136 tests pass across 5 test suites. The `--dry` run resolves a 9-node DAG correctly. No crashes observed.
- **Rank 2 (state/lifecycle):** Clean. Run-lock tests (2 passing), cache-invalidation coverage present, seed and loop-seed tests pass.

## Decision summary

One finding, one dimension, zero production-code change. Adds a regression test for a DAG operator that currently has no coverage. Fits the maintainer standard: small, reviewable, evidence-backed, and prevents a future determinism bug.
