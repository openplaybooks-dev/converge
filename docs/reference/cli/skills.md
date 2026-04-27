---
title: "converge skills"
description: "Manage and install skills."
sidebar:
  order: 12
---

Skills are reusable repair recipes (TASK.md files) that the framework registers into its strategy catalog. This command manages the skills installed for a project.

## Usage

```bash
converge skills <subcommand> [options]
```

## Subcommands

| Subcommand | Purpose |
|---|---|
| `list` | List available skills. |
| `install` | Install skills to a target directory. |

## Options

| Flag | Default | Effect |
|---|---|---|
| `--target=PATH` | `.claude/skills` | Target directory for installation. |
| `--skill=NAME` | (all) | Specific skill to install. |
| `--force` | off | Force overwrite existing skills. |
| `--verbose`, `-v` | off | Show detailed installation info. |

## Examples

```bash
# What skills are available?
converge skills list

# Install all skills to default location.
converge skills install

# Install just one skill, overwriting if present.
converge skills install --skill=converge-control --force

# Install to a different target dir.
converge skills install --target=.skills
```

## How skills relate to the framework

A skill is a `TASK.md` file declaring a repair recipe with frontmatter (gap kinds it handles, context steps it needs, etc.) and a body prompt. When a check fails, the framework looks at the skills registered in its catalog (alongside built-in TS-class strategies) and dispatches to a matching one.

For the engineering view, see [Advanced: the strategy catalog](/advanced/04-strategy-catalog).

## When to use

- **First-time setup.** `converge skills install` after `converge init` to populate `.claude/skills/` with the standard recipes.
- **After upgrading converge.** Re-run install with `--force` to refresh skills the framework ships.
- **Project-specific customization.** Drop your own `*.md` skills into `.claude/skills/` and they're picked up automatically — no install needed.

## Caveats

- Default target `.claude/skills` is the convention for Claude Code projects. Use `--target` if you want a different layout.
- `--force` overwrites local edits. If you've customized a shipped skill, copy it under a different name first.
