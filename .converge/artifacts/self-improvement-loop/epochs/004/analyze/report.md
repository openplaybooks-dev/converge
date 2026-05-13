# Epoch 004 — Selection Report

**Selected:** escalate-no-actionable-findings
**Decision:** Fail epoch intentionally with `needs-human-backlog/priority-update`

## Maintainer rationale

All actionable findings in epoch 004 are repeats. The full test suite (142 tests) shows exactly 2 failures — both are the same two bugs that have failed in every prior epoch:

| Failure | Test | Epochs failed |
|---|---|---|
| hooks-throw-timeout | tests/playbook-hooks.test.ts:225 | 002, 003, 004 |
| select-parent-plus-missing-children | tests/playbook-dag.test.ts:257 | 001, 003, 004 |

Three prior epochs attempted to address these. Epoch 001 (select-parent-plus-missing-children) failed. Epoch 002 (hooks-throw-timeout) failed. Epoch 003 intentionally escalated. Continuing to select code-level fixes without human investigation of the root causes is unproductive.

## Rejected alternatives

### select-parent-plus-missing-children (priority 1 — failing test)
**Rejected:** Repeat of epoch 001. Already attempted and failed. The DAG dynamic spawn gap needs root-cause analysis beyond the scope of a single epoch.

### hooks-throw-timeout (priority 1 — failing test)
**Rejected:** Repeat of epoch 002. Already attempted and failed. The hook error isolation timeout (10000ms) suggests a deeper issue in promise chains or task lifecycle boundaries.

### compile-determinism (phase 2 probe failure)
**Rejected:** Not in findings.json. The "No playbook.yml found" error during `compile` command is a new signal but needs investigation in a future observe phase before it qualifies as a finding.

### cache-invalidation (phase 2 probe — inconclusive)
**Rejected:** Inconclusive probe. --dry mode may bypass cache freshness checks. Needs non-dry verification.

### Missing regression for critical path
**Considered but rejected:** Adding regression tests for seed loops, compile manifests, DAG selection, run locks, provider failures, or cache invalidation. Blocked because the two root-cause failures mask the ability to validate new regressions. Fix the root causes first.

## Next steps for human maintainer

1. Investigate root cause of hook error isolation timeout — the 10000ms timeout suggests a hanging promise or unhandled rejection in the hook executor boundary.
2. Investigate --select parent+ dynamic spawn DAG gap — child TASK.md files are not materialized after parent+ selection, suggesting a missing step in the spawn chain during DAG compilation.
3. Consider splitting each into a narrowly scoped fix with a focused regression test before attempting broader changes.
4. Once root causes are resolved, resume the self-improvement loop with fresh observe probes.
