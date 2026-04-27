---
title: "converge migrate"
description: "Migrate V1 project structure to V2."
sidebar:
  order: 10
---

One-time migration of a V1-era project to the V2 layout. Most projects don't need this; only relevant if you have a project predating the V2 split between playbook source and journal state.

## Usage

```bash
converge migrate [options]
```

## Description

V1 placed spawned tasks under `.converge/playbooks/<pb>/tasks/<parent>/tasks/<child>/` — mixing source-of-truth task definitions with execution state.

V2 places spawned tasks under `.converge/journal/<pb>/tasks/<parent>/spawned/<child>/` and tracks a playbook hash for change detection — keeping playbook source immutable and journal state separate.

`migrate` detects V1 layout and moves spawned tasks into the V2 location.

**Dry-run by default.** No files are moved unless you pass `--apply`.

## Options

| Flag | Default | Effect |
|---|---|---|
| `--apply` | off | Actually move files and write journal hash. Default is dry-run. |
| `--force` | off | Overwrite conflicting journal destinations. |
| `--dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Show each moved task. |

## Examples

```bash
# Report what would change. Safe to run repeatedly.
converge migrate

# Execute the migration.
converge migrate --apply

# Overwrite if journal destinations already exist.
converge migrate --apply --force
```

## What it does

1. Walks `.converge/playbooks/<pb>/tasks/` looking for nested `tasks/<child>/` directories that look like spawned tasks.
2. For each, computes the V2 destination at `.converge/journal/<pb>/tasks/<parent>/spawned/<child>/`.
3. In dry-run, reports what would move. With `--apply`, performs the move and writes a playbook hash for change detection.

## When to use

- **Once.** When upgrading a V1 project to a converge version that requires V2.
- **Then never again.** Modern projects start in V2. If you're scaffolding new projects with `converge init`, you'll never need this.

## Caveats

- Always run dry-run first to see what will move.
- `--force` overwrites the V2 destination if it exists. If you've already partially migrated, this can lose work — back up first.
- Migration doesn't touch the source `playbook.yml` or top-level task definitions. Only spawned-task locations move.
