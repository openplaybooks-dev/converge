---
title: "converge show"
description: "Visualize project data: Gantt, graph, journal, metrics, trend."
sidebar:
  order: 5
---

Pretty-print specific views of project data.

## Usage

```bash
converge show <view> [options]
```

## Views

| View | Purpose |
|---|---|
| `gantt` | Show Gantt chart timeline of execution order. |
| `graph [filter]` | Show task dependency graph (add `--detail` for data flow). |
| `journal [groupId]` | Show execution history from logs. |
| `metrics` | Show cost, token, and model metrics. |
| `trend` | Show weighted gap convergence trend across runs. |

## View-specific options

### `gantt`

| Flag | Effect |
|---|---|
| `--only-blocked` | Show only blocked tasks. |
| `--only-ready` | Show only ready (runnable) tasks. |

### `graph`

| Flag | Effect |
|---|---|
| `--detail` | Show data-flow detail. |

### `journal`

| Flag | Effect |
|---|---|
| `--only-retries` | Show only tasks with multiple attempts. |

### `metrics`

| Flag | Effect |
|---|---|
| `--playbook=NAME` | Filter to a specific playbook. |
| `--by-epic` | Break down by group. |
| `--by-task` | Break down by task. |
| `--by-model` | Break down by model. |
| `--top=N` | Show top N entries. |
| `--json` | Output as JSON. |
| `--save` | Save metrics to file. |

## Common flags

| Flag | Default | Effect |
|---|---|---|
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
# Gantt timeline.
converge show gantt
converge show gantt --only-blocked

# Dependency graph.
converge show graph
converge show graph --detail

# Execution journal.
converge show journal
converge show journal 03-implement
converge show journal --only-retries

# Cost and token metrics.
converge show metrics
converge show metrics --by-model --top=5

# Convergence trend.
converge show trend
```

## When to use

- **`gantt`** to see runtime structure: what runs in parallel, what blocks what.
- **`graph`** to reason about dependency shape, not execution order.
- **`journal`** for "what happened recently."
- **`metrics`** to track costs and token usage across runs.
- **`trend`** to track whether your playbook is converging faster or slower.

## Caveats

- These views read existing journal data. They don't trigger runs or recompute anything.
- For programmatic access, prefer `inspect --json`.
