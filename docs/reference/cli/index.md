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
converge .converge/playbooks/landing-page/playbook.yml list
converge .converge/playbooks/default/tasks/01-setup/TASK.md inspect
```

## Commands

| Command | Purpose |
|---|---|
| [`init`](./init) | Scaffold a new project. |
| [`add`](./add) | Create a playbook from a prompt, example, or GitHub repo. |
| [`run`](./run) | Execute tasks via the convergence loop. Use flags for build, test, retry, compile modes. |
| [`list`](./list) | Print tasks matching a selection. The "what would run" preview. |
| [`show`](./show) | Visualize project data: Gantt, graph, journal, metrics, trend. |
| [`inspect`](./inspect) | Inspect execution sessions and tasks at any depth. |
| [`clean`](./clean) | Delete artifacts or reset task state. |

## Run modes

`run` accepts these mode flags instead of separate commands:

| Flag | Effect | Replaces |
|---|---|---|
| `--fail-fast` | Stop on first uncorrectable failure | `build` |
| `--resume` | Resume from the last failure point | `retry` |
| `--dry` | Print the would-run preview, no execution | `compile` |

## Global options

These flags work on every command.

| Flag | Effect |
|---|---|
| `--select`, `-s` | Selection expression. |
| `--exclude`, `-e` | Subtractive expression. |
| `--selector` | Shortcut for `--select selector:NAME`. |
| `--playbook=NAME` | Which playbook (required when the project has >1). |
| `--state=PATH` | Path to a prior `target/` for `state:` comparisons. |
| `--defer` | Use prior outputs from `--state` instead of re-running upstream tasks. |
| `--full-refresh` | Force non-incremental execution; rebuild from scratch. |
| `--dir=PATH` | Project directory. Defaults to current working directory. |
| `--verbose`, `-v` | Verbose output. |

Run `converge <command> --help` for the canonical option reference for any command. The pages below mirror that help with examples and context.

## Common patterns

```bash
# Fresh project: init, create a playbook, run it.
converge init
converge add --from-prompt "Generate a competitive landscape report"
converge run

# See what's pending.
converge list --exclude 'status:complete'

# Preview what would run before committing.
converge list --select 'state:modified+' --state /tmp/last-good

# Run in fail-fast mode (build).
converge run --fail-fast

# Resume after a kill or crash.
converge run --resume

# Visualize the DAG.
converge show graph --detail

# Check task status tree.
converge show gantt

# After fixing a check by hand: re-verify without re-executing.
converge run --dry

# How much did this run cost?
converge show metrics --by-model --top=5

# Deep inspect a session.
converge inspect --task=01-setup --converge

# Clean up and reset.
converge clean --select=failed-task-id
```
