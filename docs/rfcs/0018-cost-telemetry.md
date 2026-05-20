---
rfc: 0018
title: Cost & token telemetry per task
status: draft
type: feat
source: human
priority_tier: tier3
estimate: "3-4 days"
backwards_compatible: yes
risk: low
---
# RFC 0018: Cost & token telemetry per task

## Problem

At thousands-of-tasks scale, knowing per-task cost is essential for:
- Budgets (RFC 0006 needs this for accurate estimates).
- Identifying expensive tasks for optimization.
- Provider/model comparison.
- Billing transparency.

Today: no cost data anywhere in the journal.

## Proposal

Every AI invocation captures and emits:

```json
{
  "eventType": "AI_USAGE",
  "taskId": "001-home-03-convert",
  "provider": "claude",
  "model": "MiniMax-M2.7",
  "endpoint": "https://api.minimax.io/anthropic",
  "tokensIn": 4231,
  "tokensOut": 1572,
  "costUsd": 0.0824,
  "durationMs": 12450,
  "cacheHit": false
}
```

Sum per task → `task.totalCostUsd`. Sum per run → `run.totalCostUsd`. Roll-up: `converge metrics --by task --metric cost`.

### Provider integration

Each provider adapter in `packages/core/src/ai/` (or wherever the providers live) is responsible for emitting the AI_USAGE event after a call returns. The provider knows its own pricing model; the framework normalizes to USD.

### Pricing

A `pricing.yml` file shipped with each provider adapter:

```yaml
"claude-sonnet-4-6":
  inputPer1MTokens: 3.00
  outputPer1MTokens: 15.00
  cacheReadPer1MTokens: 0.30
"MiniMax-M2.7":
  inputPer1MTokens: 0.40
  outputPer1MTokens: 1.20
```

Users can override in `project.yml`.

## Implementation steps

1. Define the AI_USAGE event schema.
2. Add a wrapper in `packages/core/src/ai/agentfn.ts` (or equivalent) that captures usage from each provider's response.
3. Per-provider pricing files.
4. Reporting CLI: `converge metrics --cost`, `converge metrics --by task --cost`.

## Test plan

1. Mock provider returns known token counts → cost computed correctly.
2. Cache hit (lower input cost) → reflected in costUsd.
3. Roll-up: a task with 5 AI calls reports correct total.
4. Run-level roll-up matches sum of all task costs.

## Out of scope

- Real-time cost capping mid-run (RFC 0006's hard budget can read this).
- Per-team billing (workspace-level concept).
