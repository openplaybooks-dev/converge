---
title: "converge spawn"
description: "Materialize one spawned task or a batch of spawned tasks from templates."
sidebar:
  order: 15
---

Create tasks from spawn templates.

`spawn` is the explicit operator-facing entrypoint for task materialization outside the normal autonomous loop.

## Usage

```bash
converge spawn <id> <template> [options]
converge spawn --batch <file.jsonl|->
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--var k=v` | none | Template variable substitution. Repeatable. |
| `--after <sibling>` | none | Add dependency edges after one or more sibling tasks. Repeatable. |
| `--no-inherit` | off | Disable inheritance from the parent template/context. |
| `--dry` | off | Validate and preview without writing files. |
| `--batch=PATH` | none | Read batch spawn requests from a JSONL file or `-` for stdin. |

## Examples

```bash
converge spawn 03a-backend service-task --var language=typescript
converge spawn 03b-frontend ui-task --after 03a-backend
converge spawn --batch spawned.jsonl
```

## Notes

- The old flags `--from`, `--parent`, `--playbook`, `--title`, `--summary`, `--goal-id`, and `--depends-on` are rejected explicitly.
- Batch mode is the right fit when an external script or planner is materializing many tasks at once.

