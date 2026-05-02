---
title: "converge reset"
description: "Delete journal state at any scope (project, playbook, task subtree)."
sidebar:
  order: 5
---

> **Note:** This command has been renamed in v2. Use [`converge clean`](./clean) instead.

Surgical removal of journal state. Useful when you want to re-run a task or playbook from scratch without affecting the rest of the project.

## Usage

```bash
converge reset --all                       # delete entire .converge/journal/
converge reset <playbook>                  # delete one playbook's journal
converge reset <playbook> <taskPath>       # delete one task subtree (incl. spawned descendants)
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--dir=PATH` | cwd | Project directory. |

## Description

The journal is the source of truth for run state — checkpoints, attempts, learn files, gathered facts. `reset` removes it at the scope you ask for. The next `converge run` re-creates fresh journal state for whatever you reset.

`<taskPath>` is the slash-separated journal id, **not** the filesystem path:

✅ `parent` or `parent/spawn-a` — journal id

❌ `tasks/parent` or `parent/spawned/spawn-a` — filesystem path with internal markers, rejected

Resetting a parent task also deletes any spawned descendants (they live inside the parent's subtree).

## Examples

```bash
# Nuclear option — delete the entire journal across all playbooks.
converge reset --all

# Delete one playbook's journal. Source playbook.yml + tasks/ are untouched.
converge reset deep-research

# Delete one task and its descendants.
converge reset deep-research parent/spawn-a
```

## What's preserved

Reset only touches `.converge/journal/`. Everything else stays:

- `.converge/playbooks/<name>/playbook.yml` and `tasks/` — the source playbook is the immutable blueprint.
- The project's actual files (e.g. `apps/landing/src/`) — the agent's work product is not in the journal.
- `project.yml` and other configuration.

So a reset followed by `converge run` re-executes the affected tasks but starts from whatever artifacts those tasks already produced — which may or may not be what you want. If you also want to delete the produced artifacts, do that manually before running.

## When to use

- **Iterative playbook development.** Edit a TASK.md, reset that one task, re-run to verify.
- **Recovering from a corrupted journal.** Reset the affected playbook and resume.
- **Sharing a project state.** `git commit` everything except journal, then a fresh clone + `converge run` reproduces from scratch.

## Caveats

- **Deleted state cannot be recovered.** No trash, no undo. Back up `.converge/journal/<playbook>/` first if you might want it later.
- Resetting the journal does NOT roll back the agent's actual work product. If a task created `output.json`, that file still exists after reset; the next run sees it and may skip "creating" it again depending on check semantics.
- Resetting `--all` while a run is active is unsafe. Stop runners first (`pkill -f "converge run"`).
