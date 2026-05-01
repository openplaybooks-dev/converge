---
title: "converge deps"
description: "Install and list skills and plugins declared in playbook.yml."
sidebar:
  order: 20
---

Install and list skills and plugins declared in `playbook.yml`. Replaces the old `converge skills install` and `converge skills list`. Single verb for dependency management.

## Usage

```bash
converge deps <subcommand> [options]
```

## Subcommands

| Subcommand | Purpose |
|---|---|
| `install [name]` | Install all declared deps, or a specific skill/plugin by name. |
| `list` | List installed skills and plugins with versions. |
| `update [name]` | Update to latest compatible version. |

## Options

| Flag | Default | Effect |
|---|---|---|
| `--plugins` | off | With `list`, show only plugins. |
| `--playbook=NAME` | (auto-detect) | Which playbook. |
| `--project-dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# Install all dependencies declared in the playbook.
converge deps install

# Install a specific skill.
converge deps install pdf-report

# List everything installed.
converge deps list

# List only plugins.
converge deps list --plugins
```

## When to use

- **After cloning a repo.** `converge deps install` pulls down the skills and plugins the playbook needs.
- **Checking what's installed.** `converge deps list` shows versions and sources.
- **After editing `playbook.yml` dependencies.** Re-run `converge deps install` to sync.
