---
id: 006-read-the-journal
title: Write docs/guides/read-the-journal.md
inputs:
  - packages/core/src/journal/types.ts
  - packages/core/src/journal/reader.ts
  - .converge/journal
outputs:
  - docs/guides/read-the-journal.md
checks:
  - id: page-exists
    cmd: "test -f docs/guides/read-the-journal.md"
    description: page exists
  - id: page-frontmatter
    cmd: "head -10 docs/guides/read-the-journal.md | grep -q '^title:' && head -10 docs/guides/read-the-journal.md | grep -q '^sources:'"
    description: title + sources frontmatter
  - id: shows-journal-path
    cmd: "grep -qE '\\.converge/journal' docs/guides/read-the-journal.md"
    description: documents the journal location
  - id: shows-learn-md
    cmd: "grep -qE 'LEARN\\.md' docs/guides/read-the-journal.md"
    description: covers LEARN.md
  - id: shows-cat-or-jq
    cmd: "grep -qE 'cat|jq|tail|less' docs/guides/read-the-journal.md"
    description: shows shell debugging commands
  - id: word-count-ok
    cmd: "test -f docs/guides/read-the-journal.md && wc -w docs/guides/read-the-journal.md | awk '{exit ($1>=600&&$1<=1500?0:1)}'"
    description: 600-1500 words
---

# Write `docs/guides/read-the-journal.md`

The journal is the debugger. This page teaches the reader to read it.

This is **not** the troubleshooting page — that's
`/troubleshooting/`. This guide teaches the *skill* of reading what's
there. The troubleshooting pages assume you've read this guide and are
matching a symptom to a fix.

## Required frontmatter

```yaml
---
title: "Read the journal (LEARN.md & events)"
description: "ls and cat are your debugger. Reading the journal, reading events, and how LEARN.md carries failure context forward."
sources:
  - packages/core/src/journal/types.ts
  - packages/core/src/journal/reader.ts
  - .converge/journal/
sidebar:
  order: 6
---
```

## Required structure

1. **Where it lives.** Every run writes events to `.converge/journal/`.
   Show the directory shape with a real `tree -L 3 .converge/journal/`
   excerpt (8-12 lines max).

2. **What's in there.** Briefly enumerate the file kinds: events,
   checkpoints, attempts, `LEARN.md`. Reference
   `packages/core/src/journal/types.ts` for the actual `JournalEvent`
   discriminated union and pull the type names directly from there.

3. **Reading events with shell tools.**
   ```bash
   ls .converge/journal/<run-id>/
   cat .converge/journal/<run-id>/events.jsonl | jq 'select(.type=="task.failed")'
   tail -f .converge/journal/<run-id>/events.jsonl
   ```

4. **Per-attempt forensics.** Each task attempt writes:
   - `attempts/NN/FEEDBACK.md` — what the agent tried.
   - `attempts/NN/CHECK.md` — which checks passed / failed and why.
   - `attempts/NN/LEARN.md` — structured failure analysis (next attempt
     reads this first).
   - `attempts/NN/logs/events.jsonl` — per-attempt events.

   Show how to find the right attempt:
   ```bash
   J=.converge/journal/<playbook>/tasks/<task-path>
   cat $J/checkpoint.json | python3 -m json.tool
   cat $J/attempts/01/FEEDBACK.md
   cat $J/attempts/01/CHECK.md
   cat $J/attempts/01/LEARN.md
   ```

5. **Checkpoints.** When a run is interrupted (Ctrl-C, crash, timeout),
   converge writes a checkpoint that lets the next `converge run --resume`
   pick up where it left off. The checkpoint lives at
   `.converge/journal/<playbook>/<task-path>/checkpoint.json`.

6. **LEARN.md.** The most under-appreciated file in the framework.
   When a check fails, the agent writes structured failure analysis to
   `LEARN.md`. The next attempt reads it. This is *not* "retry and hope" —
   it's failure-as-context.

   Show what a `LEARN.md` block looks like (synthesize from the journal
   reader code; if the format isn't well-documented, reverse-engineer
   from one of the journals under `.converge/journal/` in this repo).

7. **When to look at the journal vs use the CLI.**
   - `converge status` — quick "what's done / what's pending" view.
   - `converge inspect` — current run state.
   - `converge show journal` / `converge show gantt` — TUI views.
   - The raw files — when you need exact event ordering, exact failure
     text, or to grep across the whole history.

8. **Where to go next.**
   - [Troubleshooting](/troubleshooting/) — symptom-indexed fixes that
     assume you've read this guide.
   - [Reference: CLI commands](/reference/cli/) — `inspect`, `show`,
     `status` flag detail.

## Read first

- `packages/core/src/journal/types.ts` — the canonical event shapes.
- `packages/core/src/journal/reader.ts` — how events get parsed.
- A real journal under `.converge/journal/` for example data.

## Banned

- Inventing event types. Cite the discriminated union from `types.ts`.
- Recommending a third-party log viewer. The whole point is `cat` works.
- Inventing the LEARN.md format. Read it from a real run or the source.
- Putting symptom-fix pairs here. Those belong in Troubleshooting.
