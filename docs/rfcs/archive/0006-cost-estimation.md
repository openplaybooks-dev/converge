---
rfc: 0006
title: Pre-flight cost estimation
status: withdrawn
type: feat
source: human
priority_tier: tier0
estimate: "3-4 days"
backwards_compatible: yes
risk: low
---
# RFC 0006: Pre-flight cost estimation

## Problem

A user runs `converge run` and discovers six hours later that the playbook spent $45. A typo in a spawn loop can cost hundreds of dollars before anyone notices. Today there's no pre-flight estimate.

## Proposal

`converge plan --estimate` (or `converge run --estimate-only`) that:

1. Walks the static DAG via existing compile.
2. For each task with `seed: { mode: cli }` or AI-invoking checks, counts as 1 AI call (or N if statically-determinable spawn count).
3. Multiplies by a per-provider, per-model unit cost (declared in `project.yml`).
4. Sums to a total dollar estimate + 80th-percentile from historical runs (when available).

## Configuration

```yaml
# project.yml
costEstimation:
  defaults:
    perAiCallUsd: 0.05         # rough default
    perAiCallSeconds: 30
  byModel:
    "MiniMax-M2.7":
      perCallUsd: 0.02
      perCallSeconds: 45
    "claude-opus-4-7":
      perCallUsd: 0.30
      perCallSeconds: 25
  budget:
    softLimitUsd: 50          # warn at this
    hardLimitUsd: 200         # `converge run` refuses without --confirm
```

Plus per-task hint (optional):

```yaml
# task TASK.md frontmatter
estimatedCost:
  callsPerRun: 2     # this task invokes the agent ~2 times
```

## Output

```
$ converge plan --estimate

  Playbook: default
  DAG: 63 nodes, 47 will invoke AI

  Estimated cost:    $11.20 — $22.40 (P50–P95 from 14 prior runs)
  Estimated time:    1h 45m — 3h 12m
  By model:
    MiniMax-M2.7     43 calls × $0.02 = $0.86
    claude-opus-4-7   4 calls × $0.30 = $1.20

  Soft budget: $50.00 ✓
  Hard budget: $200.00 ✓

  Use --confirm to skip this prompt next time.
```

## Code-level design

- New module: `packages/core/src/planning/cost-estimator.ts`.
- Reads compiled manifest, per-task frontmatter, project.yml.
- Historical data: read past `runstate.json` files in journal archives; bucket by task ID; compute P50/P95.
- Surface through `converge plan` and as a banner in `converge run` (gated on hard limit).

## Implementation steps

1. Define the schema (project.yml additions, TASK.md additions).
2. Estimator function pure of side effects.
3. Wire into `converge plan` output.
4. Add the gate in `converge run` (refuse without --confirm above hard limit).
5. Persist actual costs (RFC 0018) — once done, estimates get more accurate.

## Test plan

1. Synthetic DAG with known costs → estimate matches.
2. Run a real playbook, compare estimate to actual within 50%.
3. Hard-limit gate: run with budget=$1 on a $5 playbook → refused without `--confirm`.

## Depends on

- RFC 0018 (cost telemetry per task) for historical data accuracy. Until 0018 lands, estimates use static defaults.

## Out of scope

- Tokenizer-level cost estimation (predicting actual token counts). The flat-call model is good enough for v1.
