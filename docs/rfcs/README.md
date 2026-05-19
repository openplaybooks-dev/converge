# Converge RFCs

Improvement proposals for the Converge framework, scoped to the goal of running **thousands of tasks across days** with the cleanest DX and the most AI-agent-friendly contract.

Each RFC is self-contained: problem statement, current behaviour with file references, proposed change, code-level design, migration impact, and test plan. Pick one up and execute without needing to re-derive the analysis.

## Priority queue

Ordered by ROI given the goal. Each "Top 3" entry has a full RFC ready to execute.

### **CRITICAL** — discovered during baby-app run, blocking real workloads

| # | Title | RFC | Estimate |
|---|---|---|---|
| 20 | Container convergence detection — fix infinite re-lease loop | [0020-container-convergence-bug.md](0020-container-convergence-bug.md) | 1-2 days |

### Top 3 (high ROI, immediate)

| # | Title | RFC | Estimate |
|---|---|---|---|
| 1 | Compile-time cross-template var validator | [0001-cross-template-var-validator.md](0001-cross-template-var-validator.md) | 1 day |
| 2 | Structured JSON spawn protocol | [0002-structured-spawn-protocol.md](0002-structured-spawn-protocol.md) | 2-3 days |
| 3 | Three-tier error classification + retry policies | [0003-error-classification-retry.md](0003-error-classification-retry.md) | 4-5 days |

### Tier 0 (survival — required for thousand-task runs)

| # | Title | RFC | Estimate |
|---|---|---|---|
| 4 | Partitioned, indexed journal | [0004-partitioned-journal.md](0004-partitioned-journal.md) | 1 week |
| 5 | Frontier checkpoint for fast resume | [0005-frontier-checkpoint.md](0005-frontier-checkpoint.md) | 3-4 days |
| 6 | Pre-flight cost estimation | [0006-cost-estimation.md](0006-cost-estimation.md) | 3-4 days |
| 7 | Distributed worker boundary | [0007-distributed-workers.md](0007-distributed-workers.md) | 3-4 weeks |

### Tier 1 (AI-agent friendliness)

| # | Title | RFC | Estimate |
|---|---|---|---|
| 8 | Skill discovery API | [0008-skill-discovery-api.md](0008-skill-discovery-api.md) | 2-3 days |
| 9 | Structured retry context | [0009-structured-retry-context.md](0009-structured-retry-context.md) | 3-4 days |
| 10 | Typed lessons (replace LEARN.md prose) | [0010-typed-lessons.md](0010-typed-lessons.md) | 2-3 days |

### Tier 2 (DX)

| # | Title | RFC | Estimate |
|---|---|---|---|
| 11 | Live observability dashboard | [0011-live-dashboard.md](0011-live-dashboard.md) | 2 weeks |
| 12 | Doctor as a pre-flight phase | [0012-doctor-preflight.md](0012-doctor-preflight.md) | 3-4 days |
| 13 | Surgical reset with cascade semantics | [0013-surgical-reset.md](0013-surgical-reset.md) | 3-4 days |
| 14 | Playbook-as-versioned-package | [0014-playbook-package.md](0014-playbook-package.md) | 2-3 weeks |
| 15 | Hot-reload TASK.md edits | [0015-hot-reload-tasks.md](0015-hot-reload-tasks.md) | 1 week |

### Tier 3 (long-term contract polish)

| # | Title | RFC | Estimate |
|---|---|---|---|
| 16 | Idempotency tokens on spawns | [0016-idempotency-tokens.md](0016-idempotency-tokens.md) | 3-4 days |
| 17 | Successor contract (`on_fail:`) | [0017-successor-contract.md](0017-successor-contract.md) | 1 week |
| 18 | Cost & token telemetry per task | [0018-cost-telemetry.md](0018-cost-telemetry.md) | 3-4 days |
| 19 | Per-attempt snapshot bundles | [0019-attempt-snapshots.md](0019-attempt-snapshots.md) | 3-4 days |

## How to pick one up

1. Read the RFC end-to-end.
2. Confirm the "current behaviour" section by reading the cited code locations.
3. Branch from `main`. Branch name `rfc/NNNN-<slug>`.
4. Follow the **Implementation steps**. Each step is verifiable in isolation.
5. Run the **Test plan**. Add tests for any uncovered branches.
6. Update the affected examples (RFC lists which).
7. Open a PR titled `feat: <title> (RFC #NNNN)`. Link the RFC.

## Conventions

- Every RFC names code locations as `path:line` (e.g. `packages/core/src/seed/cli-spawn.ts:178`). Verify line numbers haven't drifted before relying on them.
- Every RFC states whether it's **backwards-compatible** or **breaking**. Breaking RFCs include a migration plan.
- Effort estimates assume one engineer familiar with the codebase. Multiply by 1.5 for first-time contributors.
