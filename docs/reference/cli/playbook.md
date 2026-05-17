---
title: "converge playbook"
description: "Inspect, summarize, validate, and review history for named playbooks."
sidebar:
  order: 21
---

`playbook` is the named-playbook management namespace.

Use it when you want to discover available playbooks, inspect one in detail, validate its definition, or review historical runs.

## Usage

```bash
converge playbook list
converge playbook info <name>
converge playbook history <name> [--last N]
converge playbook validate <name> [--json]
```

## Subcommands

| Subcommand | Effect |
|---|---|
| `list` | List available playbooks in the project. |
| `info <name>` | Show metadata, inputs, task DAG summary, run config, and checks. |
| `history <name>` | Show prior execution history and trend summaries. |
| `validate <name>` | Run pre-flight structural validation for the playbook definition. |

## Options

| Flag | Applies to | Effect |
|---|---|---|
| `--last N` | `history` | Limit displayed executions. |
| `--json` | `validate` | Emit validation report as JSON. |
| `--dir=PATH` | all | Project directory. |
| `--verbose` | `list` | Show more metadata in the list view. |

## Examples

```bash
converge playbook list
converge playbook info deep-research
converge playbook history deep-research --last 5
converge playbook validate deep-research
```

## Validation scope

`playbook validate` is definition-focused. It reports:

- structural folder / file problems
- malformed goals
- malformed `SKILL.md` files
- missing `TASK.md` files referenced by the playbook
- non-fatal warnings such as deprecated fields

For runtime-state issues after execution, use [`doctor`](./doctor).

