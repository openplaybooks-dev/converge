---
title: "converge clean"
description: "Delete artifacts under target/ and journal subtrees. Surgical alternative to --restart."
sidebar:
  order: 18
---

Delete artifacts under `target/` and journal subtrees for selected tasks. Takes `--select` so you can reset a single subtree instead of the whole playbook. The surgical alternative to the removed `--restart` flag.

## Usage

```bash
converge clean --select <expression> [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--select`, `-s` | (required) | Which tasks to clean. |
| `--exclude`, `-e` |: | Subtractive expression. |
| `--selector` |: | Shortcut for `--select selector:NAME`. |
| `--orphaned` | off | Clean orphaned artifacts not owned by any task. |
| `--playbook=NAME` | (auto-detect) | Which playbook. |
| `--project-dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# Reset a single failed task subtree.
converge clean --select 'result:error'

# Clean everything under the keyframes phase.
converge clean --select '07-keyframes+'

# Full state wipe (equivalent to old --restart).
converge clean --select '*'

# Clean orphaned files not tracked by any task.
converge clean --orphaned
```

## When to use

- **Resetting a failed subtree before retry.** `clean --select 'result:error'` then `run --select 'result:error+'`.
- **Removing stale artifacts from a phase you're redoing.**
- **Orphan cleanup** after removing tasks from the playbook.
- **Don't use `--restart` anymore.** It was removed. `clean --select '*'` is the equivalent.
