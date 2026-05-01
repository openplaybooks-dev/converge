---
title: "converge debug"
description: "Verify config, structure, checkpoint consistency, and plugin loading. Replaces verify."
sidebar:
  order: 19
---

Verify config validity, directory structure, checkpoint consistency, and plugin loading. Replaces the old `converge verify`. Adds `--revalidate` for the legacy "re-run checks of completed tasks and revert if they fail" behavior.

## Usage

```bash
converge debug [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--select`, `-s` | (all) | Which tasks to debug. |
| `--exclude`, `-e` | — | Subtractive expression. |
| `--fix` | off | Attempt to auto-fix detected issues. |
| `--revalidate` | off | Re-run checks of completed tasks and revert to pending if checks fail. The legacy `--resume` auto-revalidation, now opt-in. |
| `--state=PATH` | — | Path to a prior `target/` for `state:` comparisons. |
| `--playbook=NAME` | (auto-detect) | Which playbook. |
| `--project-dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# Verify everything.
converge debug

# Verify and auto-fix structural issues.
converge debug --fix

# Re-run checks of all completed tasks, revert any that fail.
converge debug --revalidate --select 'status:complete'

# Revalidate only tasks whose check block changed.
converge debug --revalidate --select 'state:modified.checks' --state /tmp/last-good
```

## When to use

- **After editing a check by hand.** `debug --revalidate` re-runs the check against current state. If it passes, the task stays complete. If it fails, the task reverts to pending.
- **Before a long run.** Verify the project structure is sound.
- **After a crash.** `debug --fix` repairs checkpoint inconsistencies.
- **`test` vs `debug --revalidate`:** `test` reports pass/fail without changing state. `debug --revalidate` reports AND reverts completed tasks whose checks fail.
