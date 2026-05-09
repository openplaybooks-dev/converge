---
title: "converge metrics"
description: "Cost, token, and model metrics with breakdowns."
sidebar:
  order: 8
---

Show what a project cost in tokens and dollars. Breaks down by epic, task, or model.

## Usage

```bash
converge metrics [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--by-epic` | off | Break down by epic. |
| `--by-task` | off | Break down by task. |
| `--by-model` | off | Break down by AI model. |
| `--top=N` | (all) | Show only the top N entries. |
| `--json` | off | Output as JSON. |
| `--save` | off | Save metrics to a file in the journal. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
# Project-wide totals.
converge metrics

# Top 5 epics by cost.
converge metrics --by-epic --top=5

# Per-model breakdown: useful when running multi-provider.
converge metrics --by-model

# Machine-readable for scripts and dashboards.
converge metrics --by-model --json

# Save to journal for later comparison.
converge metrics --save
```

## What's reported

For each grouping (epic, task, model), the standard set:

- **Input tokens**: total prompt tokens sent.
- **Output tokens**: total completion tokens received.
- **Cache read / cache creation tokens**: Anthropic prompt-caching breakdown.
- **Cost USD**: derived from per-model rates.
- **Calls**: number of model invocations.
- **Top usage**: the heaviest tasks or epics.

## When to use

- **After a long run** to see what it cost.
- **Before scaling up**: extrapolate from a small run to a large one.
- **Comparing providers**: `--by-model` makes the cost difference between Claude/Gemini/Kimi explicit.
- **Identifying expensive tasks**: `--by-task --top=10` shows what to optimize.

## Caveats

- Metrics are accurate only for AI calls the framework brokers. Tool calls (Bash, Read, etc.) inside the agent's runtime have no token cost from the framework's view.
- Provider-specific cache tokens require the provider to expose them. Anthropic does; others may not.
