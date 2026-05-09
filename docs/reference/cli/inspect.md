---
title: "converge inspect"
description: "Inspect execution sessions and tasks at any depth."
sidebar:
  order: 6
---

Detailed introspection of what happened inside a task or session. Where `status` shows the project tree, `inspect` zooms in on a single thing.

## Usage

```bash
converge inspect [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--converge` | off | Show convergence graph for a task. |
| `--depth=N` | `2` | Tree depth. Use `0` for full expansion. |
| `--sessions` | off | Show only sessions summary, not the task tree. |
| `--json` | off | Export to JSON format (machine-readable). |
| `--verbose`, `-v` | off | Verbose output. |
| `--dir=PATH` | cwd | Project directory. |
| `--task=NAME` | — | Target a specific task. |

## Examples

```bash
# Project-wide inspect: sessions, recent activity.
converge inspect

# Drill into one task: see all attempts, checks, gathered facts.
converge inspect --task=01-setup

# Show the convergence graph (the navigator's action history).
converge inspect --task=01-setup --converge

# Sessions summary as JSON for scripting.
converge inspect --sessions --json
```

## What `--converge` shows

When you pass `--converge` on a task, the output includes the navigator's action graph for that task: the sequence of actions the runtime took, with timestamps, statuses, and gap snapshots. Useful for understanding why a task converged or stalled.

See [Advanced: the navigator graph](/advanced/01-navigator-graph) for what the graph means.

## When to use

- **Debugging a failed task.** `converge inspect --task=<name>` shows attempts, gathered facts, and the latest LEARN.md.
- **Auditing a session.** `converge inspect --sessions` lists recent runs; `converge inspect` drills into one.
- **Scripting against journal data.** `--json` produces structured output suitable for piping to `jq`.

## Caveats

- Inspect is read-only. It never modifies state.
- `--depth=0` on a deep task can produce a lot of output. Pipe to `less` or use `--json | jq` for navigation.
