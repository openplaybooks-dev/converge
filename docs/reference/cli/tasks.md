---
title: "converge tasks"
description: "Inspect and mutate the runtime task ledger."
sidebar:
  order: 18
---

Inspect and mutate the runtime ledger in `.converge/inventory/<playbook>/tasks.jsonl`.

This command family is for task-level operator workflows such as waiting on spawned work, marking status, or debugging phantom ids.

## Usage

```bash
converge tasks list --playbook <name> [options]
converge tasks status <id> --playbook <name>
converge tasks wait <id> --playbook <name> [--timeout S] [--interval S]
converge tasks wait-many --ids-file <path> --playbook <name> [--timeout S] [--interval S]
converge tasks mark <id> --status <status> --playbook <name> [--reasoning TEXT]
```

## Subcommands

| Subcommand | Effect |
|---|---|
| `list` | Emit runtime tasks as JSON, optionally filtered by source or status. |
| `status <id>` | Print one task's runtime status or `missing`. |
| `wait <id>` | Poll one task until it settles. |
| `wait-many` | Poll many tasks from a JSON array file. |
| `mark <id>` | Append a runtime status update for a task. |

## Options

| Flag | Applies to | Effect |
|---|---|---|
| `--playbook=NAME` | all | Required unless `CONVERGE_PLAYBOOK` is set. |
| `--source=spawned|static|backlog` | `list` | Filter by task source. |
| `--status=STATUS` | `list`, `mark` | Filter or set runtime status. |
| `--timeout=S` | `wait`, `wait-many` | Timeout in seconds. |
| `--interval=S` | `wait`, `wait-many` | Poll interval in seconds. |
| `--ids-file=PATH` | `wait-many` | JSON file containing an array of task ids. |
| `--reasoning=TEXT` | `mark` | Attach a status-reasoning note. |

## Notes

- `wait-many` detects **phantom ids**: task ids that were referenced by work-item flow but never reached the journal or ledger.
- Terminal runtime states are `done`, `blocked`, and `dropped`.

