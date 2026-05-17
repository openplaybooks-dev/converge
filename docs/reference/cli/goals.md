---
title: "converge goals"
description: "Inspect and mutate goal completion state for a playbook."
sidebar:
  order: 16
---

Manage playbook goals and their done sentinels.

The source of truth for goal completion is the sentinel directory under `.converge/artifacts/<playbook>/goals/`.

## Usage

```bash
converge goals list --playbook <name>
converge goals pending --playbook <name>
converge goals next --playbook <name>
converge goals done <id> --playbook <name> [--force]
converge goals undone <id> --playbook <name>
```

## Subcommands

| Subcommand | Effect |
|---|---|
| `list` | Emit all goals as JSON, annotated with `done: bool`. |
| `pending` | Emit the unfinished subset as JSON. |
| `next` | Emit the next buildable goal as JSON, or `{"done":true}`. |
| `done <id>` | Re-validate the goal's checks, then write its done sentinel. |
| `undone <id>` | Remove a goal's done sentinel. |

## Options

| Flag | Effect |
|---|---|
| `--playbook=NAME` | Required unless `CONVERGE_PLAYBOOK` is already set. |
| `--force` | On `done`, bypass re-validation. Requires `CONVERGE_ALLOW_FORCE_DONE=1`. |

## Examples

```bash
converge goals list --playbook default
converge goals next --playbook default
converge goals done ship-cli-redesign --playbook default
converge goals undone ship-cli-redesign --playbook default
```

## Safety

`goals done --force` is intentionally gated by `CONVERGE_ALLOW_FORCE_DONE=1` because it bypasses re-validation and can mark a goal complete even when the underlying checks no longer pass.

