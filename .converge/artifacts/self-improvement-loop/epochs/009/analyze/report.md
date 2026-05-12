# Selection Report — Epoch 009

## Selected: `core-test-regression-45-failures`

**Priority class:** Correctness (selection rank 1 — failing test root cause)

### Maintainer rationale

This is a textbook priority-1 target: 45+ unit tests are failing across two core modules (journal/structure and manifest/run-state-manager). The regression is clear, measurable, and blocks any other framework work — you cannot refactor or add features when the test suite is red. The observe probe confirms the failures are real and concentrated: 23/28 in journal/structure, 17/18 in run-state-manager, with minor collateral in structure-rules (1/21) and buggy-check-relaxer (4/10). Fixing the shared root cause likely resolves most or all failures at once.

### Rejected alternatives

None. The findings file contains only one finding (`core-test-regression-45-failures`). All higher priority tiers were checked: no crashes or stalled runs were observed (CLI build passes, core build passes, CLI --help works). Lower-tier improvements (API cleanup, docs) cannot be considered while the test suite is red.

### Anti-repeat verification

- **Last two epochs:** epoch 4 (`escalation-duplicate-epochs`) and epoch 5 (`runstate-missing-crash`) — both Correctness dimension but different failure classes (duplicate detection infrastructure, crash detection coverage). This epoch targets unit test regressions, a distinct failure class.
- **Candidate files not in recent touched-files:** `run-state-manager.ts` and `journal/structure.ts` do not appear in epochs 4–5 touched-files.
- **Not low-value cleanup:** This is a correctness fix, not cosmetic/DX work.

### Evidence summary

| Source | Finding |
|--------|---------|
| `npx vitest run tests/unit` (packages/core) | journal/structure.test.ts: 23/28 failed |
| `npx vitest run tests/unit` (packages/core) | manifest/run-state-manager.test.ts: 17/18 failed |
| `npx vitest run tests/unit` (packages/core) | structure-rules.test.ts: 1/21 failed |
| `npx vitest run tests/unit` (packages/core) | buggy-check-relaxer.test.ts: 4/10 failed |

### Test strategy

Run existing root-level regression tests that exercise the manifest/DAG and runstate/loop paths (`playbook-compile`, `playbook-dag`, `playbook-loop-seed`, `playbook-seeds`) alongside the failing unit tests within packages/core. The root-level tests serve as integration regression coverage.
