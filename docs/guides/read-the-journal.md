---
title: "Read the journal (LEARN.md & events)"
description: "ls and cat are your debugger. Reading the journal, reading events, and how LEARN.md carries failure context forward."
sidebar:
  order: 6
---
# Read the journal

The journal is the debugger. This page teaches the skill of reading it — not as a troubleshooting reference, but as a way to understand what the framework actually did and why.

This is **not** the troubleshooting page. That one lives at `/troubleshooting/` and assumes you've read this guide. Here you're learning the mechanics: what files exist, what they contain, and how to read them with standard shell tools.

## Where it lives

Every converge run writes to `.converge/journal/`. The structure is:

```
.converge/journal/
├── default/                      # default playbook runs
│   ├── sessions/<session-id>/
│   │   ├── checkpoint.json      # session-level checkpoint
│   │   └── events.jsonl         # all events for this session
│   └── tasks/<epic>/tasks/<task-id>/
│       ├── checkpoint.json      # task-level checkpoint
│       ├── status.json         # current task status
│       ├── events.jsonl        # task-level events
│       └── attempts/<NN>/
│           ├── checkpoint.json
│           ├── events.jsonl
│           ├── FEEDBACK.md
│           ├── CHECK.md
│           ├── LEARN.md
│           └── logs/
└── <playbook>/                  # named playbook runs
    └── tasks/<epic>/tasks/<task-id>/
        └── ...
```

The exact layout varies slightly by playbook and run mode, but the pattern holds: each level (session, epic, task) has its own event stream and checkpoint file.

## What's in there

Four file kinds matter day-to-day:

**`events.jsonl`** — the raw event log, one JSON object per line. Every converge operation appends here: task start/stop, checks run, gaps detected, corrections applied. This is the source of truth when you need exact ordering or exact failure text.

**`checkpoint.json`** — a snapshot written when a run is interrupted (Ctrl-C, crash, timeout). Lets `converge run --resume` pick up exactly where it left off.

**`status.json`** — current state of a task: status (`pending` | `running` | `complete` | `failed`), which attempt this is, checklist completion, and any error message.

**`attempts/<NN>/`** — per-attempt directory. Each attempt gets its own forensic record (see below).

**`LEARN.md`** — the most underappreciated file in the framework. Written when a check fails, read at the start of the next attempt. This is not "retry and hope" — it's failure-as-context.

## The event types

The canonical event shapes are in `packages/core/src/journal/types.ts`. The `JournalEvent` discriminated union names the types you'll see most:

- `SESSION_START` / `SESSION_END` — session boundaries
- `ITERATION_START` / `ITERATION_COMPLETE` — each correction loop iteration
- `TASK_START` / `TASK_COMPLETE` / `TASK_FAILED` — task lifecycle
- `EPIC_START` / `EPIC_COMPLETE` / `EPIC_FAILED` — epic lifecycle
- `CHECK_RUN` / `CHECK_PASSED` / `CHECK_FAILED_DETAIL` — check execution
- `GAP_DETECTED` / `GAP_RESOLVED` / `GAP_FIX_FAILED` — gap tracking
- `CORRECTION_LOOP_START` / `CORRECTION_LOOP_EXHAUSTED` / `CORRECTION_ATTEMPTED` / `CORRECTION_DIAGNOSIS` / `CORRECTION_APPLIED` / `CORRECTION_VERIFIED` — the inner correction loop
- `LIFECYCLE_BEFORE_START` / `LIFECYCLE_BEFORE_COMPLETE` / `LIFECYCLE_BEFORE_FAILED` — before-phase hooks
- `LIFECYCLE_AFTER_START` / `LIFECYCLE_AFTER_COMPLETE` / `LIFECYCLE_AFTER_FAILED` — after-phase hooks
- `REWIND_TRIGGERED` / `REWIND_SUCCEEDED` / `REWIND_FAILED` — rewind/retry state

## Reading events with shell tools

No GUI needed. `cat`, `jq`, and `tail` are the intended tools.

List what's available for a run:

```bash
ls .converge/journal/<run-id>/
```

Filter events by type:

```bash
cat .converge/journal/<run-id>/events.jsonl | jq 'select(.eventType=="task.failed")'
```

Watch events in real time:

```bash
tail -f .converge/journal/<run-id>/events.jsonl
```

Filter by level (project/epic/task):

```bash
cat .converge/journal/<run-id>/events.jsonl | jq 'select(.level=="task")'
```

Find errors:

```bash
cat .converge/journal/<run-id>/events.jsonl | jq 'select(.eventType=="ERROR" or .eventType=="TASK_FAILED")'
```

## Per-attempt forensics

When a task attempt completes (success or failure), converge writes a structured record:

```
attempts/<NN>/
├── CHECK.md          # which checks passed / failed and why
├── FEEDBACK.md      # what the agent tried this attempt
├── LEARN.md         # structured failure analysis — next attempt reads first
├── checkpoint.json
└── logs/
    └── events.jsonl  # per-attempt event stream
```

Find the right attempt:

```bash
J=.converge/journal/<playbook>/tasks/<epic>/tasks/<task-id>
cat $J/checkpoint.json | python3 -m json.tool
# look for currentAttempt number, then:
cat $J/attempts/01/FEEDBACK.md
cat $J/attempts/01/CHECK.md
cat $J/attempts/01/LEARN.md
```

## Checkpoints

A checkpoint is written when a run is interrupted. It records the exact state needed to resume:

```bash
cat .converge/journal/<playbook>/tasks/<epic>/tasks/<task-id>/checkpoint.json | python3 -m json.tool
```

Resume a stopped run:

```bash
converge run --resume
```

The checkpoint tells converge which tasks are complete, which failed, and which checklist items remain.

## LEARN.md

When a check fails, the agent writes structured failure analysis to `LEARN.md` before the attempt ends. On the next attempt, converge reads this file first — it informs the next strategy, not just "try again."

A `LEARN.md` block describes what happened, why it failed, and what the agent concluded. The format is derived from the journal reader and gap fixer system. You can read it directly:

```bash
cat .converge/journal/<playbook>/tasks/<epic>/tasks/<task-id>/attempts/01/LEARN.md
```

The key insight: `LEARN.md` carries failure context *forward*. If check #3 failed last attempt, the next attempt knows exactly what check #3 was trying to verify and why it didn't pass.

## When to use the journal vs the CLI

| Situation | Use |
|---|---|
| Quick "what's done / what's pending" | `converge status` |
| Current run state, full detail | `converge inspect` |
| TUI view of journal | `converge show journal` |
| TUI view of task timeline | `converge show gantt` |
| Exact event ordering across a run | Raw `events.jsonl` files |
| Exact failure text for a specific check | `cat attempts/NN/CHECK.md` |
| Grepping across whole run history | `grep -r .converge/journal/` |
| Finding what the agent concluded after a failure | `cat attempts/NN/LEARN.md` |

## Where to go next

- [Troubleshooting](/troubleshooting/) — symptom-indexed fixes, assumes you've read this guide
- [Reference: CLI commands](/reference/cli/) — `inspect`, `show`, `status` flag detail
