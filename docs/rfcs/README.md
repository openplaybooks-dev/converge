# Converge RFCs

Improvement proposals for the Converge framework, scoped to the goal of running **thousands of tasks across days** with the cleanest DX and the most AI-agent-friendly contract.

Each RFC is self-contained: problem statement, current behaviour with file references, proposed change, code-level design, migration impact, and test plan. Pick one up and execute without needing to re-derive the analysis.

## Priority queue

Ordered by ROI given the goal. Each "Top 3" entry has a full RFC ready to execute.

### **CRITICAL** — discovered during baby-app run, blocking real workloads

| # | Title | RFC | Estimate |
|---|---|---|---|
| 20 | Container convergence detection — fix infinite re-lease loop | [0020-container-convergence-bug.md](0020-container-convergence-bug.md) | 1-2 days |
| 21 | Declarative spawn manifests + per-task execution directory | [0021-declarative-spawn-apply.md](0021-declarative-spawn-apply.md) | 4-5 days |
| 22 | Task mode contract — declared lifecycle, validated outcome | [0022-task-mode-contract.md](0022-task-mode-contract.md) | 3-4 days |

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

## Autonomous shipping

This repo runs two playbooks that close the loop on RFCs:

- **`rfc-ideation`** drafts new RFCs from GitHub issues, `docs/ideas/*.md`, the backlog, and code-discovered findings. New drafts land here with `status: draft`.
- **`rfc-shipping`** picks `status: accepted` RFCs, branches, implements, runs the Test plan, and opens a PR for human merge.

**The human gate is the `status:` field.** Edit `status: draft → status: accepted` to enqueue an RFC for shipping. The pre-commit hook in `.githooks/pre-commit-rfc-accept` auto-stamps `accepted_at:` on that flip. The shipping playbook never auto-merges — you remain the merge authority.

See `.converge/playbooks/rfc-ideation/PLAN.md` and `.converge/playbooks/rfc-shipping/PLAN.md` for the full mechanism.

## Frontmatter schema

The frontmatter is the contract between human, ideation playbook, and shipping playbook. Required fields:

```yaml
---
title: <short imperative>
status: draft | accepted | stale | implementing | implementing-needs-human | shipped | rejected
type: fix | feat | deprecation | breaking | chore | refactor
source: <issue#N | idea:docs/ideas/foo.md | backlog:<id> | code-finding:<hash> | human>
priority_tier: critical | tier0 | tier1 | tier2 | tier3
estimate: <e.g. "1 day", "3-4 days", "1 week">
backwards_compatible: yes | no
risk: low | medium | high
# Conditional:
accepted_at: <iso8601>   # auto-filled by .githooks hook on status → accepted
migration_plan: <one-line summary>   # REQUIRED for type: breaking | deprecation
deprecation_window: <e.g. "2 minor versions">   # REQUIRED for type: deprecation
breaks_existing: yes | no   # REQUIRED for type: feat that adds public surface
---
```

### Status lifecycle

```
draft ──(human accepts)──▶ accepted ──(shipping starts)──▶ implementing ──(PR merged)──▶ shipped
  │                            │                                  │
  │                            └─(citations drifted)─▶ stale      └─(tests fail)─▶ implementing-needs-human
  │
  └──(human rejects)──▶ rejected (file kept for history)
```

- **`draft`** → just landed from ideation; awaiting human review.
- **`accepted`** → human approved; shipping will pick it up in priority order.
- **`stale`** → cited file:line refs no longer hold (drift > 20 lines since `accepted_at`); requires re-drafting.
- **`implementing`** → a PR is open against `rfc/NNNN-<slug>`.
- **`implementing-needs-human`** → PR open but with `tests-failing` label; needs human attention before merge.
- **`shipped`** → PR merged.
- **`rejected`** → human reviewed and declined.

### Type-driven policy

| `type:` | Required extra fields | Shipping behavior |
|---|---|---|
| `fix` | — | normal pipeline |
| `feat` | `breaks_existing` (required for public surface) + example usage block + alternatives considered | normal pipeline |
| `refactor` | — | normal pipeline |
| `chore` | — | express lane: minimal template (Problem + Fix only), batches up to 5 per PR, <50 LOC ceiling, no high-risk files |
| `deprecation` | `migration_plan`, `deprecation_window` | normal pipeline + human approval label |
| `breaking` | `migration_plan` | normal pipeline + human approval label |

### Risk levels

- **`low`** (default) — safe everyday changes
- **`medium`** — touches non-load-bearing framework code; reviewer should still scrutinize
- **`high`** — touches load-bearing files (e.g. `packages/core/src/orchestrator/spawn*.ts`, `packages/core/src/seed/cli-spawn.ts`, `packages/core/src/run/index.ts`); PR body includes a `framework-core-ok` checkbox the human must tick before merge.

The shipping playbook's `04-implement` guardrail blocks diffs against high-risk files unless the RFC declares `risk: high`.

## Conventions

- Every RFC names code locations as `path:line` (e.g. `packages/core/src/seed/cli-spawn.ts:178`). Ideation's `cite-check` task verifies these at draft time; shipping's `rebase-check` task re-verifies (±20 line tolerance) when picking up an Accepted RFC. RFCs whose citations drift too far get demoted to `status: stale`.
- Every RFC states whether it's **backwards-compatible** or **breaking**. Breaking RFCs include a migration plan.
- Effort estimates assume one engineer familiar with the codebase. Multiply by 1.5 for first-time contributors.
- Numbering is assigned at *index* time by `claim-next-rfc-number.mjs` (flock-guarded), not at draft time, so concurrent ideation epochs can't collide on the same number.
- The Accepted queue has a back-pressure limit of 10 RFCs. If you accept faster than shipping can keep up, the ideation playbook will halt with an `authoring`-class error until the queue drains.
