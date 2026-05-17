---
title: "CLI"
description: "The full converge CLI command catalog, from the common path to advanced and auxiliary commands."
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
converge examples/game-assets/.converge/project.yaml run
converge .converge/playbooks/landing-page/playbook.yml list
converge .converge/playbooks/default/tasks/01-setup/TASK.md inspect
```

## Command catalog

The CLI surface is broader than the getting-started path. This table lists the commands exposed by the binary today. Commands with dedicated reference pages are linked; the rest are currently best referenced through `converge <command> --help`.

| Command | Purpose | Docs |
|---|---|---|
| [`init`](./init) | Scaffold a new project. | page |
| [`add`](./add) | Create a playbook from a prompt, example, or GitHub repo. | page |
| [`run`](./run) | Execute tasks via the convergence loop. | page |
| `retry` | Compatibility alias for `run --resume`. | help |
| `build` | Compatibility command for fail-fast execution. | help |
| `compile` | Compatibility command for compile / dry-run style validation. | help |
| `test` | Compatibility command for checks-only execution. | help |
| [`list`](./list) / `ls` | Print tasks matching a selection. | page |
| [`show`](./show) | Visualize Gantt, graph, journal, metrics, or trend views. | page |
| [`inspect`](./inspect) | Inspect execution sessions and tasks. | page |
| [`clean`](./clean) | Delete artifacts or reset task state. | page |
| [`stop`](./stop) | Cancel the currently running execution and clear its run lock. | page |
| [`plan`](./plan) | Plan / preview a playbook before running. | page |
| [`verify`](./verify) | Re-run verification checks for completed tasks. | page |
| [`status`](./status) | Show the current execution's task status. | page |
| [`metrics`](./metrics) | Emit execution metrics directly. | page |
| [`docs`](./docs) | Generate browsable HTML docs for a playbook. | page |
| [`doctor`](./doctor) | Workspace health check. | page |
| [`spawn`](./spawn) | Build or validate explicit seed spawn commands. | page |
| [`reset`](./reset) | Reset a playbook's state or a single task. | page |
| [`deps`](./deps) | Manage skill dependencies. | page |
| [`playbook`](./playbook) | Inspect and validate named playbooks. | page |
| [`goals`](./goals) | Inspect and mutate playbook goal state. | page |
| [`skills`](./skills) | List playbook-scoped skills. Bundled skill install currently happens via `init --skills`. | page |
| [`tasks`](./tasks) | Task-state inspection helpers such as wait-many. | page |
| `swebench` | Materialize and run SWE-bench playbooks. | help |
| `tbench` | Materialize and run tbench playbooks. | help |

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

Run `converge <command> --help` for the canonical option reference for any command. The linked pages below cover the most-used commands in full; the rest are part of the supported binary surface even if they do not yet have standalone reference pages.

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
