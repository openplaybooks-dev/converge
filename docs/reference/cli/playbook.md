---
title: "converge playbook"
description: "List playbooks, show their DAG, view execution history."
sidebar:
  order: 11
---

Inspect playbooks at the project level. Different from `inspect` (which targets specific tasks) — `playbook` operates on the playbook as a whole.

## Usage

```bash
converge playbook <subcommand> [options]
```

## Subcommands

| Subcommand | Purpose |
|---|---|
| `list` | List available playbooks in the project. |
| `info <name>` | Show playbook details — inputs, DAG, run config, project-level checks. |
| `history <name>` | Show execution history (past runs) for a playbook. |

## Options

| Flag | Default | Effect |
|---|---|---|
| `--dir=PATH` | cwd | Project directory. |
| `--last=N` | (all) | Show last N history entries. (For `history` subcommand only.) |

## Examples

```bash
# What playbooks does this project have?
converge playbook list

# Detail on one playbook.
converge playbook info landing-page

# Last 5 runs of a playbook.
converge playbook history landing-page --last=5
```

## What `info` shows

For the named playbook:

- **Run configuration** — mode (`oneoff` / `converge` / `loop`), max iterations, max attempts, max duration.
- **Tasks** — top-level tasks with their dependencies (the DAG).
- **Inputs** — what files the playbook reads.
- **Project-level checks** — checks declared in `playbook.yml` (vs. per-task checks in `TASK.md`).

## What `history` shows

For each past run of the playbook:

- Start and end timestamps.
- Tasks completed / failed / pending.
- Total duration.
- Outcome (converged, hit max-iterations, killed, etc.).

Use `--last=N` to limit; default shows all available history.

## When to use

- **`list`** when navigating a project with multiple playbooks.
- **`info`** when you want to understand a playbook's shape without opening files.
- **`history`** when debugging runs across time — "why did this take longer last week?"
