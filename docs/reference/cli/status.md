---
title: "converge status"
description: "Show project status and the task tree."
sidebar:
  order: 4
---

The default snapshot of where a project is. Combines what previous versions called the `tree` and `checkpoint` commands into a single view.

## Usage

```bash
converge status [filter] [options]
```

The optional `filter` narrows the displayed tree to matching tasks.

## Options

| Flag | Default | Effect |
|---|---|---|
| `--checkpoint` | off | Show checkpoint detail (iteration, timestamps, task lists). |
| `--filter=PATTERN` | (none) | Filter tasks by name. Equivalent to the positional `filter`. |
| `--detail` | off | Show detailed task info (description, dependencies). |
| `--show-paths` | off | Show file paths for each task. |
| `--show-descriptions` | off | Show task descriptions inline. |
| `--only-incomplete` | off | Hide completed tasks. Helpful on long playbooks. |
| `--max-depth=N` | (full) | Maximum tree depth. |
| `--show-cursor` | off | Show the runner's current cursor position. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
# Project-wide tree.
converge status

# Just tasks matching '02-api':
converge status 02-api

# Quick pending-work view.
converge status --only-incomplete --max-depth=2

# Full detail for one task.
converge status --detail 03-build

# Checkpoint detail (iteration counts, timestamps).
converge status --checkpoint
```

## Output

A tree like:

```
📁 .converge/playbooks/landing-page/tasks/
    ├── ✓  1-5. 01-prepare-spec  [4/4 done]
    ├── ✓ 6-11. 02-bootstrap-astro  [5/5 done]
    ├── ◑  18. 04-build-sections  (seeded)  [40/48 done, 8 pending]
    └── ○ 46-55. 10-verify  ▶  [3/9 done, 6 pending]
            ├── ✓ 47. 001-build-clean
            ├── ⟳ 48. 002-dev-smoke   ← currently running
            └── ○ ...

📊 Tasks: 60  Completed: 51  Running: 1  Failed: 0  Pending: 8
⟳  Parent task executing: 48. 10-verify / 002-dev-smoke
   Next subtask: 46-55. 10-verify  ▶
```

Symbols:

- `✓` complete
- `○` pending
- `◑` seeded (WBS parent with children, partially done)
- `⟳` running
- `▶` next to be executed
- `✗` failed
- `🚫` blocked

## Path-based mode

Like most commands, `status` accepts a path prefix to scope output:

```bash
converge .converge/playbooks/landing-page/playbook.yml status
```

Useful when a project has multiple playbooks and you want one in isolation.

## When to use

- **First thing you check after starting a run.** Validates the runner picked up the right playbook.
- **Before `--resume`.** See what was complete and what was in flight.
- **During long runs.** Re-run periodically — it's cheap and always reflects current state.
- **Before opening a journal.** `status` tells you which task to look at first.
