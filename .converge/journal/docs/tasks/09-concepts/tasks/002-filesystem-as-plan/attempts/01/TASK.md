# Task: 09-concepts/002-filesystem-as-plan

# Write `docs/concepts/filesystem-as-plan.md`

Why everything is plain files. The principle behind the journal layout.

## Required frontmatter

```yaml
---
title: "Filesystem-as-plan"
description: "Plans, state, and history are plain files. ls and cat are your debugger."
sources:
  - .converge/journal/
  - packages/core/src/journal/types.ts
sidebar:
  order: 2
---
```

## Required structure

1. **The principle.** Every artifact converge produces is a plain file:
   playbooks (`playbook.yml`), tasks (`TASK.md`), runtime state (the journal).
   No databases. No daemons. Just files in `.converge/`.

2. **What this buys you.**
   - **`git diff` shows what changed.** Plans, runs, failures — all in version
     control if you choose.
   - **`grep`, `cat`, `tail` are your debugger.** No SQL, no admin UI required.
   - **Crash-safe by construction.** If the process dies, the next run reads
     the same files and resumes.
   - **No state migrations.** Schema changes are file-format changes; your
     existing files keep working or get refactored explicitly.
   - **Easy to fork, share, archive.** A playbook is a directory. Email it,
     git push it, drop it on a USB stick.

3. **The journal layout.** Brief tour of `.converge/journal/`:
   ```
   .converge/journal/
   └── <run-id>/
       ├── events.jsonl       # append-only event log
       ├── checkpoint.json    # current run state for resume
       └── <task-id>/
           ├── LEARN.md       # accumulated failure analysis
           └── ...
   ```

4. **The trade-off.** Filesystem-as-plan means no out-of-the-box query layer
   (you write your own `jq` filters). For most use cases this is fine — for
   high-volume multi-tenant scenarios you'd want a real DB. Converge
   optimizes for "I run my own playbooks", not "I host playbooks for
   thousands of users".

5. **The `ls/cat` debug session.** Show a real one — pick a journal run,
   show the events.jsonl tail, show the LEARN.md content. Make the case
   concrete.

## Read first

- A real journal under `.converge/journal/` in the repo.
- `packages/core/src/journal/types.ts` for canonical event shapes.

## Banned

- "It's just files, problem solved" — name the trade-off (no query layer
  by default). Trust readers to handle nuance.
- Pretending the journal is human-readable JSON. JSONL is line-oriented
  but each line is dense; show realistic `jq` filters.