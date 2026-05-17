---
title: "converge status"
description: "Show the current execution tree or checkpoint state."
sidebar:
  order: 11
---

Show current execution state for a playbook.

By default, `status` renders the task tree view. With `--checkpoint`, it prints saved checkpoint detail instead.

## Usage

```bash
converge status [playbook] [task] [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--playbook=NAME` | auto-detect / env | Scope to a specific playbook. |
| `--checkpoint` | off | Show checkpoint detail instead of the task tree. |
| `--show-paths` | off | Show filesystem paths in the tree. |
| `--show-descriptions` | off | Show task descriptions. |
| `--only-incomplete` | off | Filter to incomplete tasks. |
| `--max-depth=N` | full | Limit tree depth. |
| `--show-cursor` | off | Show cursor / focus state. |
| `--detail` | off | Show additional task metadata. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
converge status
converge status deep-research
converge status deep-research 03-synthesize
converge status --checkpoint
converge status --only-incomplete --max-depth=2
```

## Positional forms

- `converge status` → auto-detected playbook or all visible state
- `converge status <playbook>` → scope to one playbook
- `converge status <playbook> <task>` → scope to one playbook and filter to a task subtree
- `converge status <task>` → treat the positional value as a task filter when it is not a known playbook

