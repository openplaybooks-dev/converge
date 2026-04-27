---
title: "CLI"
description: "Every converge CLI command, with usage, options, and examples."
sidebar:
  order: 0
---

The `converge` CLI is the primary interface for running and inspecting playbooks. Two invocation forms:

```bash
converge <command> [options]               # operate on the current project (cwd)
converge <path> <command> [options]        # operate on a specific path
```

Path-based execution lets you target a specific project, playbook, or task without changing directories:

```bash
converge examples/game-assets/.converge/project.yml run
converge .converge/playbooks/landing-page/playbook.yml status
converge .converge/playbooks/default/tasks/01-setup/TASK.md inspect
```

## Commands by intent

### Workflow

The day-to-day commands. You'll use these every session.

| Command | Purpose |
|---|---|
| [`init`](./init) | Initialize a new project with `.converge/` scaffolding. |
| [`plan`](./plan) | Generate a playbook from a one-line goal. |
| [`run`](./run) | Execute the autonomous agent loop. The main command. |
| [`status`](./status) | Show project status and the task tree. |
| [`reset`](./reset) | Delete journal state at any scope (project, playbook, task subtree). |
| [`verify`](./verify) | Verify config, structure, and checkpoint consistency. |

### Inspection

Read what happened, with structured detail.

| Command | Purpose |
|---|---|
| [`inspect`](./inspect) | Inspect execution sessions and tasks at any depth. |
| [`show`](./show) | Visualize project data — Gantt timeline, dependency graph, journal, backlog, trend. |
| [`metrics`](./metrics) | Cost, token, and model metrics with breakdowns. |

### Management

Configure and extend.

| Command | Purpose |
|---|---|
| [`playbook`](./playbook) | List playbooks, show their DAG, view execution history. |
| [`skills`](./skills) | Manage and install skills. |
| [`goals`](./goals) | Evaluate project goals and plan remediation. |
| [`migrate`](./migrate) | Migrate V1 project layout to V2. |

## Global options

These flags work on every command.

| Flag | Effect |
|---|---|
| `--dir=PATH` | Project directory. Defaults to current working directory. |
| `--verbose`, `-v` | Verbose output. Useful for diagnosing what the framework is doing. |

Run `converge <command> --help` for the canonical option reference for any command. The pages below mirror that help with examples and context.

## Common patterns

A few invocations that come up constantly:

```bash
# Fresh project: init, generate a playbook from a prompt, run it.
converge init --yes
converge plan "Generate a competitive landscape report" --name=research
converge run

# Mid-flight: see what's complete, what's pending.
converge status
converge status --only-incomplete --max-depth=2

# After a kill or crash: pick up where we left off.
converge run --resume

# After editing a check by hand: reconcile checkpoints with reality.
converge verify --fix

# Look at what attempt 3 of a task actually did.
converge .converge/playbooks/research/tasks/02-investigate inspect --depth=0

# How much did this run cost, broken down by epic?
converge metrics --by-epic --top=5
```
