---
title: "converge list"
description: "Print tasks matching a selection. The 'what would run' preview."
sidebar:
  order: 17
---

Prints tasks matching a selection expression, with their status, tags, and node state. The "what would run" preview — run it before any `run` or `build` to confirm the resolved set. Mirror of `dbt ls`.

## Usage

```bash
converge list --select <expression> [options]
```

Without `--select`, lists all tasks in the playbook.

## Options

| Flag | Default | Effect |
|---|---|---|
| `--select`, `-s` | (all) | Selection expression. |
| `--exclude`, `-e` | — | Subtractive expression. |
| `--selector` | — | Shortcut for `--select selector:NAME`. |
| `--state=PATH` | — | Path to a prior `target/` for `state:` comparisons. |
| `--max-depth=N` | — | Limit traversal to N levels. |
| `--output=FORMAT` | `table` | Output format: `table`, `json`, `name`, `path`, `selector`. |
| `--playbooks` | off | List playbooks instead of tasks. |
| `--playbook=NAME` | (auto-detect) | Which playbook. |
| `--project-dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# List all tasks.
converge list

# Preview what state:modified+ actually selects — don't commit yet.
converge list --select 'state:modified+' --state /tmp/last-good

# Show only incomplete tasks.
converge list --exclude 'status:complete'

# List at most 2 levels deep.
converge list --max-depth=2

# JSON output for scripting.
converge list --output=json

# List all playbooks in the project.
converge list --playbooks

# What depends on 03-tokens?
converge list --select '03-tokens+'
```

## When to use

- **Before `run` or `build`.** Always `list` your selection first to confirm it resolves to what you expect.
- **Checking staleness.** `list --select 'state:modified+' --state <path>` shows what changed without executing anything.
- **Scripting.** `list --output=json` feeds into CI pipelines or dashboards.
- **Discovering the graph.** `list --select '03-tokens+2'` shows exactly two levels downstream.
