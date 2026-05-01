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

### Execute

Run and build tasks. The core verbs.

| Command | Purpose |
|---|---|
| [`run`](./run) | Execute selected tasks via the convergence loop. |
| [`build`](./build) | Run + check + repair in dependency order, fail-fast. |
| [`test`](./test) | Run only checks of selected tasks. No execution, no repair. |
| [`retry`](./retry) | Resume from the last failure point. |

### Inspect

Read what happened, with structured detail.

| Command | Purpose |
|---|---|
| [`compile`](./compile) | Resolve the DAG, write `target/manifest.json`. |
| [`list`](./list) | Print tasks matching a selection. The "what would run" preview. |
| [`show`](./show) | Visualize project data — Gantt timeline, dependency graph, journal, backlog, trend. |
| [`inspect`](./inspect) | Inspect execution sessions and tasks at any depth. |
| [`metrics`](./metrics) | Cost, token, and model metrics with breakdowns. |

### Manage

Configure, maintain, and extend.

| Command | Purpose |
|---|---|
| [`clean`](./clean) | Delete artifacts under `target/` and journal subtrees. |
| [`debug`](./debug) | Verify config, structure, checkpoint consistency. |
| [`deps`](./deps) | Install and list skills and plugins. |
| [`init`](./init) | Scaffold a new project. |
| [`migrate`](./migrate) | Migrate V1 project layout to V2. |

### Reference

| Page | Purpose |
|---|---|
| [`select`](./select) | The `--select` / `--exclude` DSL — graph operators, selector methods, named selectors. |

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
| `--fail-fast` | Stop on first uncorrectable failure (default for `build`). |
| `--vars='{k: v}'` | Override playbook `vars`. |
| `--project-dir=PATH` | Project directory. Defaults to current working directory. |
| `--verbose`, `-v` | Verbose output. |

Run `converge <command> --help` for the canonical option reference for any command. The pages below mirror that help with examples and context.

## Common patterns

A few invocations that come up constantly:

```bash
# Fresh project: init, generate a playbook from a prompt, run it.
converge init --from-prompt "Generate a competitive landscape report"
converge run

# Mid-flight: see what's pending, what's done.
converge list --exclude 'status:complete'

# Preview what would run before committing.
converge list --select 'state:modified+' --state /tmp/last-good

# After a kill or crash: pick up where we left off.
converge run --resume

# After fixing a check by hand: re-verify without re-executing.
converge test --select 'state:modified.checks' --state /tmp/last-good

# Build only what changed, deferring upstream to prior outputs.
converge build --select 'state:modified+' --defer --state /tmp/last-good

# Look at what attempt 3 of a task actually did.
converge inspect .converge/playbooks/research/tasks/02-investigate --depth=0

# How much did this run cost, broken down by epic?
converge metrics --by-epic --top=5
```
