---
title: "converge show"
description: "Visualize project data: Gantt timeline, dependency graph, journal, backlog, trend."
sidebar:
  order: 7
---

Pretty-print specific views of project data. Useful for understanding shape, not just state.

## Usage

```bash
converge show <view> [options]
```

## Views

| View | Purpose |
|---|---|
| `gantt` | Show Gantt chart timeline of execution order. |
| `graph [filter]` | Show task dependency graph (add `--detail` for data flow). |
| `journal [epicId]` | Show execution history from logs. |
| `backlog` | Show accumulated backlog items (tech debt, TODOs). |
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
| `--detail` | Show data-flow detail (which task's outputs feed which task's inputs). |

### `journal`

| Flag | Effect |
|---|---|
| `--only-retries` | Show only tasks with multiple attempts. |

### `backlog`

| Flag | Effect |
|---|---|
| `--severity=LEVEL` | Filter by severity. |

## Common flags

| Flag | Default | Effect |
|---|---|---|
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
# Gantt timeline of the whole project.
converge show gantt

# Just the blocked tasks.
converge show gantt --only-blocked

# Dependency graph.
converge show graph

# Dependency graph with file flow.
converge show graph --detail

# Recent execution journal.
converge show journal

# Tasks that needed multiple attempts.
converge show journal --only-retries

# Outstanding backlog items.
converge show backlog
converge show backlog --severity=high

# Convergence trend over time.
converge show trend
```

## When to use

- **`gantt`** when you want to see runtime structure: what runs in parallel, what blocks what.
- **`graph`** when reasoning about dependency shape, not execution order.
- **`journal`** for "what happened recently": better than tailing logs.
- **`backlog`** to see TODOs the agent collected during runs.
- **`trend`** to track whether your playbook is converging faster or slower over runs.

## Caveats

- These views read existing journal data. They don't trigger runs or recompute anything.
- For programmatic access to the same data, prefer `inspect --json`.
