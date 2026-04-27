---
title: "converge verify"
description: "Verify config, structure, and checkpoint consistency."
sidebar:
  order: 9
---

Sanity-check a project's configuration, structure, and checkpoint state. Optionally auto-fix detected inconsistencies.

## Usage

```bash
converge verify [options]
converge path/to/task verify [options]
```

## Path-based forms

```bash
converge .converge/playbooks/default/tasks/01-setup verify
converge .converge/playbooks/default/tasks/01-setup/TASK.md verify
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--fix` | off | Auto-fix checkpoint inconsistencies. |
| `--rules` | off | Show validation rules instead of running them. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
# Project-wide verification — reports issues without changing anything.
converge verify

# Auto-fix detected inconsistencies.
converge verify --fix

# Show what rules `verify` checks.
converge verify --rules

# Verify a specific subtree.
converge .converge/playbooks/landing-page/tasks/03-build-screens verify
```

## What it checks

- **Config validity.** `playbook.yml`, `project.yml`, and `TASK.md` files parse and match their schemas.
- **Checkpoint consistency.** Task statuses (`pending` / `running` / `complete` / `failed`) are mutually consistent — e.g. a parent marked `complete` whose children include `pending` is flagged.
- **Output presence.** Tasks marked `complete` whose declared outputs don't exist on disk are flagged ("marked complete but missing outputs").
- **Structural rules.** Tautological checks (predicates that pass against an empty workspace), duplicate IDs, missing dependency targets, etc.

## What `--fix` does

`--fix` repairs the structurally fixable subset:

- Re-derives parent task status from children.
- Resets task status from `running` to `pending` for tasks that aren't actually running (stale state from a killed runner).
- Reconciles checkpoint timestamps against actual artifact mtimes.

It does **not** modify `playbook.yml` or `TASK.md`. Schema-level issues are reported but require manual fixes.

## When to use

- **After editing checkpoints by hand.** `--fix` reconciles your edits with the rest of the journal.
- **After a crash.** Verifies that resume can pick up cleanly.
- **Before sharing a project state.** Catches inconsistencies before someone else inherits them.
- **As a CI step.** `converge verify` exits non-zero on issues; suitable for pre-merge checks.

## Caveats

- `--fix` is best-effort. If the journal is deeply corrupted (partial JSON, conflicting child claims), some issues may need manual repair. Back up `.converge/journal/` before running `--fix` on important state.
- Verification reads files; it doesn't run any AI calls. Cheap to run repeatedly.
