---
title: "converge skills"
description: "List playbook-scoped skills for the active playbook."
sidebar:
  order: 17
---

`skills` is the playbook-scoped skill catalog command. It reads skill definitions under `.converge/playbooks/<name>/skills/`.

## Usage

```bash
converge skills list [--playbook <name>] [--human]
```

## Subcommands

| Subcommand | Effect |
|---|---|
| `list` | Emit the playbook skill catalog as JSON by default, or human-readable output with `--human`. |

## Options

| Flag | Effect |
|---|---|
| `--playbook=NAME` | Required unless `CONVERGE_PLAYBOOK` is set. |
| `--human` | Print a readable catalog instead of JSON. |
| `--dir=PATH` | Project directory. |

## Examples

```bash
converge skills list --playbook default
converge skills list --playbook default --human
```

## Notes

- Bundled Converge skills such as `converge-planning` and `converge-control` are installed through `converge init --skills`.
- `converge skills list` also reports malformed `SKILL.md` files instead of silently dropping them.
