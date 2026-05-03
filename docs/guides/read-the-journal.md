---
title: "Read the journal (LEARN.md & events)"
description: "ls and cat are your debugger. Reading the journal, events, and how LEARN.md carries failure context forward."
sidebar:
  order: 6
---
# Read the journal

The journal is the debugger. This page teaches the skill of reading it — not as a troubleshooting reference, but as a way to understand what the framework actually did and why.

This is **not** the troubleshooting page. That one lives at `/troubleshooting/` and assumes you've read this guide. Here you're learning the mechanics: what files exist, what they contain, and how to read them with standard shell tools.

## Where it lives

Every converge run writes to `.converge/journal/<playbook-name>/`. The concrete example below is from a real run of the `dbt-data-model` playbook:

```
.converge/journal/dbt-data-model/
├── .playbook-hash              # sha256 of playbook.yml (minus tasks list)
├── playbook.yml                # resolved playbook definition
├── playbook.json               # compiled playbook metadata
├── PLAN.md                     # planning artifact
├── trends.jsonl                # time-series run metrics (one per run)

├── <task-name>/                # flat per-task checkpoint stubs
│   └── checkpoint.json         # { status, completedAt }

├── executions/                 # one-off converge runs (dbt-style)
│   └── dag-<ts>/
│       ├── metadata.json       # status, duration, convergenceAchieved
│       ├── events.jsonl        # full event stream for this execution
│       └── execution.log       # human-readable log

├── sessions/                   # interactive CLI sessions
│   └── <session-id>/
│       ├── metadata.json       # sessionId, startTime, status, config
│       ├── events.jsonl        # event stream
│       └── session.log         # human-readable log

└── tasks/                      # per-task runtime state
    └── <task-id>/
        ├── TASK.md             # task definition (copy)
        ├── README.md           # task notes
        ├── checkpoint.json     # task-level checkpoint
        ├── attempts/
        │   └── <NN>/           # 01, 02, 03...
        │       ├── TASK.md     # task definition at attempt time
        │       ├── CHECK.md    # which checks passed / failed and why
        │       ├── FEEDBACK.md # what the agent tried this attempt
        │       ├── LEARN.md    # structured failure analysis
        │       ├── NEEDS.md    # unmet dependencies blocking progress
        │       ├── TASK.result.md
        │       ├── CHECK.result.md
        │       ├── NEEDS.result.md
        │       ├── data/
        │       │   ├── check.json   # check definitions with cmd strings
        │       │   └── needs.json   # input/output file patterns
        │       └── logs/
        │           ├── events.jsonl           # per-attempt event stream
        │           ├── predicate-logs.jsonl   # predicate evaluation trace
        │           ├── <timestamp>.log        # chat/agent conversation log
        │           └── <timestamp>.index.jsonl
        ├── logs/
        │   ├── convergence.json  # iteration-by-iteration convergence trace
        │   ├── events.jsonl      # aggregate events for this task
        │   └── facts.jsonl       # file-exists checks, check results
        └── tasks/                # TDD sub-tasks
            └── <subtask>/
                └── tasks/
                    ├── green/TASK.md
                    └── red/TASK.md
```

The layout varies by playbook and run mode, but the pattern holds: each playbook gets its own journal directory, each task gets a `tasks/<id>/` subtree, and each attempt gets a full forensic record.

## What's in there

### Journal root files

**`.playbook-hash`** — sha256 of the playbook definition (excluding the tasks list). Used by `state:modified.playbook` to detect project-level config changes.

**`playbook.yml`** / **`playbook.json`** — the resolved playbook definition. `playbook.json` carries compiled metadata (creation time, last run time, total runs).

**`trends.jsonl`** — one JSON line per run, recording per-run metrics (tasks completed, duration, convergence status). Used by `converge show trend`.

**`PLAN.md`** — planning artifact written during playbook generation. Captures the intent and structure decisions.

### Executions vs. Sessions

Two kinds of runtime artifact coexist:

| Artifact | When it's written | Structure |
|---|---|---|
| `executions/` | One-off `converge run` / `converge build` invocations | `metadata.json` + `events.jsonl` + `execution.log` |
| `sessions/` | Interactive CLI sessions (`converge run` with user-in-the-loop) | `metadata.json` + `events.jsonl` + `session.log` |

**`metadata.json`** records the execution/session identity, start/end time, status (`completed`, `error`, `running`), duration, and outcome summary (tasks completed, convergence achieved). This is the first file to read when you need to know "what happened in this run?"

**`events.jsonl`** — the raw event log, one JSON object per line. Every converge operation appends here: task start/stop, checks run, gaps detected, corrections applied. This is the source of truth when you need exact ordering or exact failure text.

**`execution.log`** / **`session.log`** — human-readable companion to the event stream. Prefer this for quick skimming; switch to `events.jsonl` for structured queries.

### Tasks

**`checkpoint.json`** — two layers exist:

1. **Flat stubs at journal root** (`<task-name>/checkpoint.json`): lightweight `{ status, completedAt }` markers written after task completion. Fast to scan — a single `ls` tells you which tasks are done.
2. **Full checkpoints under `tasks/<id>/checkpoint.json`**: detailed state including current attempt number, checklist progress, iteration counts, and timestamps.

**`TASK.md`** — a copy of the task definition at the start of the run. Compare with the source at `.converge/playbooks/<name>/tasks/<id>/TASK.md` to see if the task was edited mid-run.

### Attempts

Each attempt gets its own forensic record under `attempts/<NN>/`:

**`CHECK.md`** — the check report. Lists every check, whether it passed or failed, and the failure output. The first file to read when a task fails.

**`FEEDBACK.md`** — what the agent tried and what happened. The agent's own summary of its approach and results.

**`LEARN.md`** — the most underappreciated file in the framework. Written when a check fails, read at the start of the next attempt. This is not "retry and hope" — it's failure-as-context. Carries structured analysis of what went wrong and what to do differently.

**`NEEDS.md`** — unmet dependencies. If a task is blocked because an input file doesn't exist or an upstream task hasn't produced its output, NEEDS.md names what's missing.

**Result files** (`TASK.result.md`, `CHECK.result.md`, `NEEDS.result.md`) — structured outcomes from the agent's execution, parsed by the framework to determine next steps.

**`data/check.json`** — the check definitions with their exact shell command strings. Useful when you need to reproduce a check manually.

**`data/needs.json`** — input/output file patterns with block reasons. Explains *why* a task isn't ready to run.

**`logs/events.jsonl`** — per-attempt event stream. More granular than the task-level or execution-level stream.
**`logs/predicate-logs.jsonl`** — predicate evaluation trace. Shows which predicates were checked and their outcomes.

### Task-level logs

**`logs/convergence.json`** — iteration-by-iteration convergence trace. Shows the convergence loop: each iteration's actions, check results, and whether the task moved closer to done.

**`logs/events.jsonl`** — aggregate events for this task across all attempts.

**`logs/facts.jsonl`** — file-existence checks and check command results with exit codes and stdout. The raw data behind the check/fail decisions.

### TDD sub-tasks

Tasks with subtasks use a red/green TDD structure:

```
tasks/<subtask>/tasks/
├── green/TASK.md    # "make it work" — implement the feature
└── red/TASK.md      # "prove it fails" — write the failing test first
```

The framework runs `red` first (expects failure — proves the test catches the gap), then `green` (expects success — proves the implementation fills the gap). This is the same red-green-refactor cycle as test-driven development, applied to AI-generated code.

## The event types

The canonical event shapes are in `packages/core/src/journal/types.ts`. The event types you'll encounter most in a real event stream:

- `TASK_ATTEMPT_START` / `TASK_ATTEMPT_COMPLETE` / `TASK_EXECUTION_COMPLETE` — task lifecycle
- `GAP_DETECTED` / `GAP_RESOLVED` / `GAP_FIX_FAILED` — gap tracking (the core feedback loop)
- `TOOL_CALL` / `TOOL_RESULT` — agent tool invocations and their results
- `AI_OUTPUT` — raw agent output
- `CHECK_RUN` / `CHECK_PASSED` / `CHECK_FAILED` — check execution
- `SESSION_START` / `SESSION_END` — interactive session boundaries

## Reading events with shell tools

No GUI needed. `cat`, `jq`, and `tail` are the intended tools.

List what's available for a playbook:

```bash
ls .converge/journal/<playbook>/
```

List all executions and sessions:

```bash
ls .converge/journal/<playbook>/executions/
ls .converge/journal/<playbook>/sessions/
```

Read execution metadata to get the quick summary:

```bash
cat .converge/journal/<playbook>/executions/<execution-id>/metadata.json | python3 -m json.tool
```

Filter events by type:

```bash
cat .converge/journal/<playbook>/executions/<execution-id>/events.jsonl | jq 'select(.eventType=="GAP_DETECTED")'
```

Watch events in real time during a run:

```bash
tail -f .converge/journal/<playbook>/executions/<execution-id>/events.jsonl
```

Find all gap detections across a run:

```bash
cat .converge/journal/<playbook>/executions/<execution-id>/events.jsonl | jq 'select(.eventType=="GAP_DETECTED")'
```

Find task failures:

```bash
cat .converge/journal/<playbook>/tasks/<task-id>/logs/events.jsonl | jq 'select(.eventType=="CHECK_FAILED")'
```

## Per-attempt forensics

When a task attempt completes (success or failure), converge writes a structured record:

```
attempts/<NN>/
├── CHECK.md              # which checks passed / failed and why
├── FEEDBACK.md           # what the agent tried this attempt
├── LEARN.md              # structured failure analysis — next attempt reads first
├── NEEDS.md              # unmet dependencies
├── TASK.md               # task definition at attempt time
├── TASK.result.md        # structured task outcome
├── CHECK.result.md       # structured check outcome
├── NEEDS.result.md       # structured needs outcome
├── data/
│   ├── check.json        # check definitions (shell commands)
│   └── needs.json        # dependency patterns
└── logs/
    ├── events.jsonl      # per-attempt event stream
    └── predicate-logs.jsonl  # predicate evaluation trace
```

Find the right attempt:

```bash
J=.converge/journal/<playbook>/tasks/<task-id>
cat $J/checkpoint.json | python3 -m json.tool
# look for currentAttempt number, then:
cat $J/attempts/01/FEEDBACK.md
cat $J/attempts/01/CHECK.md
cat $J/attempts/01/LEARN.md
cat $J/attempts/01/NEEDS.md
```

Reproduce a failing check manually:

```bash
cat $J/attempts/01/data/check.json | python3 -m json.tool
# copy the cmd string for the failing check, then run it
```

## Checkpoints

Two layers of checkpoint exist. The flat stubs at journal root give you a fast overview:

```bash
ls .converge/journal/<playbook>/*/checkpoint.json
# extend-types/checkpoint.json    integrate-runners/checkpoint.json
# migrate-cli/checkpoint.json     run-results-manager/checkpoint.json
```

For detail on a specific task:

```bash
cat .converge/journal/<playbook>/tasks/<task-id>/checkpoint.json | python3 -m json.tool
```

Resume a stopped run (resume is the default — this is equivalent to `converge run`):

```bash
converge run
```

The checkpoint tells converge which tasks are complete, which failed, and which checklist items remain.

## convergence.json

The iteration-by-iteration convergence trace at `tasks/<id>/logs/convergence.json` shows the framework's progress toward "done." Each iteration records:

- Which checks were run and their results
- Gaps detected and the strategies dispatched to fix them
- Whether the iteration moved the task closer to convergence

Read it to understand *why* a task took 3 attempts instead of 1:

```bash
cat .converge/journal/<playbook>/tasks/<task-id>/logs/convergence.json | python3 -m json.tool
```

## facts.jsonl

The facts log at `tasks/<id>/logs/facts.jsonl` records concrete, verifiable observations:

- File existence checks (`test -f <path>`)
- Check command results with exit codes and stdout
- State queries (is this task complete? is that dependency met?)

Facts are the raw data behind check pass/fail decisions. When a check result surprises you, read the facts log to see what the framework actually observed:

```bash
cat .converge/journal/<playbook>/tasks/<task-id>/logs/facts.jsonl | jq '.'
```

## LEARN.md

When a check fails, the agent writes structured failure analysis to `LEARN.md` before the attempt ends. On the next attempt, converge reads this file first — it informs the next strategy, not just "try again."

A `LEARN.md` block describes what happened, why it failed, and what the agent concluded. The format is derived from the gap fixer system: the agent diagnoses the failure, identifies the root cause, and prescribes a targeted fix. You can read it directly:

```bash
cat .converge/journal/<playbook>/tasks/<task-id>/attempts/01/LEARN.md
```

The key insight: `LEARN.md` carries failure context *forward*. If check #3 failed last attempt, the next attempt knows exactly what check #3 was trying to verify and why it didn't pass.

## When to use the journal vs the CLI

| Situation | Use |
|---|---|
| Quick "what's done / what's pending" | `converge list --exclude 'status:complete'` |
| Current run state, full detail | `converge inspect` |
| Visual DAG with status overlays | `converge show graph` |
| Task timeline across runs | `converge show gantt` |
| Structured journal browser | `converge show journal` |
| Run metrics over time | `converge show trend` |
| Execution metadata (duration, outcome) | `cat executions/<id>/metadata.json` |
| Exact event ordering across a run | Raw `events.jsonl` files |
| Exact failure text for a specific check | `cat attempts/<NN>/CHECK.md` |
| Reproduce a check manually | `cat attempts/<NN>/data/check.json` |
| Why a task is blocked | `cat attempts/<NN>/NEEDS.md` |
| Grepping across whole run history | `grep -r .converge/journal/` |
| Finding what the agent concluded after a failure | `cat attempts/<NN>/LEARN.md` |
| Iteration-by-iteration convergence trace | `cat tasks/<id>/logs/convergence.json` |

## Where to go next

- [Troubleshooting](/troubleshooting/) — symptom-indexed fixes, assumes you've read this guide
- [Reference: CLI commands](/reference/cli/) — `inspect`, `show`, `list` flag detail
