---
title: "converge reset"
description: "Delete journal state for a whole workspace, one playbook, or one task subtree."
sidebar:
  order: 14
---

`reset` is a journal-only deletion command. It wipes state under `.converge/journal/` at a chosen scope.

Use this when you need to throw away recorded execution history without manually deleting directories.

## Usage

```bash
converge reset --all
converge reset <playbook>
converge reset <playbook> <taskPath>
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--all` | off | Delete the entire journal root. |
| `--yes`, `-y` | off | Reserved skip-confirmation flag for non-interactive flows. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
converge reset --all
converge reset deep-research
converge reset deep-research parent/spawn-a
```

## Task paths

`taskPath` is a slash-separated journal id, not a raw filesystem path.

Examples:

- `parent`
- `parent/child`
- `parent/child/grandchild`

The command rejects `..`, absolute paths, and structural markers like `tasks` or `spawned`.

