---
title: "Task execution context"
description: "Each task run lives in its own attempt directory — a structured workspace the agent can read, write, and look back across. Prior attempts are not lost; they're available for the agent to reason about."
sidebar:
  order: 6
---

## The "fresh attempt with no memory" problem

Most agent frameworks run an attempt, capture its result (success or failure), and throw the rest away. The agent runs in an opaque sandbox; on retry, a new agent starts from scratch with a synthesized "previous attempt failed because X" string and no other context.

That's a lot to give up. Inside a failed attempt are signals the agent itself produced: which files it read, which commands it ran, what stdout came back, what assertions it made and why. A fresh attempt without those signals is genuinely fresh — but also genuinely uninformed. It will often re-tread the same exploration before getting anywhere new.

The alternative is to give the agent a real workspace per attempt — files on disk it can write to, a stable layout it can predict, AND access to the workspaces of prior attempts on the same task. The agent stops being a black-box function call and starts being a process that owns a directory. Errors become something it can diagnose by reading. Patterns across attempts become something it can see.

Converge does the latter. Each attempt of each task lives in its own folder under `.converge/journal/<playbook>/tasks/<task>/attempts/<NN>/`. The agent has free read access to the whole tree. Prior attempts are preserved by default, not garbage-collected.

## What's inside an attempt folder

Every attempt directory has a consistent layout. Picking a real example from this repo (`tasks/10-verify/tasks/005-lighthouse-perf/attempts/02/`):

```
attempts/02/
├── TASK.md             ← the task spec materialized for this attempt
├── CHECK.md            ← human-readable check spec
├── NEEDS.md            ← inputs/outputs/checks declaration
├── LEARN.md            ← failure analysis carried forward from attempt 01 (if any)
├── TASK.result.md      ← what the agent produced
├── CHECK.result.md     ← which checks passed/failed, with output
├── NEEDS.result.md     ← input evaluation: which globs matched, was the task blocked
├── data/
│   ├── needs.json      ← machine-readable needs spec
│   └── check.json      ← machine-readable check spec
└── logs/
    ├── events.jsonl            ← structured task-lifecycle events
    ├── log.log                 ← human-readable run log
    ├── predicate-logs.jsonl    ← every check evaluation, with timing
    └── 2026-04-26T23-36-55-743Z_<run-id>.log     ← one log per agent process spawn
        2026-04-26T23-36-55-743Z_<run-id>.index.jsonl   ← tool-call index for that spawn
```

Three things to notice about this structure.

**Every artifact is on disk in a stable place.** Not in a database, not in process memory, not in a model's context — on the filesystem, with predictable names. The agent can `Read` any of them with the same tool it uses to read source files. There's no special "framework state" API.

**Inputs and outputs are separated.** `TASK.md`, `CHECK.md`, `NEEDS.md` are *inputs* — what the framework wrote for the agent to read. `*.result.md` files are *outputs* — what the agent produced or what was captured from running the checks. The naming convention makes it obvious which is which when you're spelunking.

**Logs are dense and structured.** `events.jsonl` and `predicate-logs.jsonl` are line-delimited JSON; the per-spawn `*.log` and `*.index.jsonl` files capture every tool call the agent made with full input and output. None of this is ephemeral. After the attempt completes, the directory stays on disk forever (unless the operator deletes the journal).

## The `wip/` symlink

While an attempt is running, the framework creates `attempts/wip/` as a symlink (junction on Windows) pointing at the current attempt's real numbered directory:

```typescript
// task-runner.ts:478
const linkType = process.platform === "win32" ? "junction" : "dir";
await fsSymlink(realAttemptDir, wipDir, linkType);
```

So while attempt 3 is in flight, both `attempts/03/` and `attempts/wip/` resolve to the same place. When the attempt completes, the symlink is removed. The next attempt creates `attempts/04/` and re-points `wip/` at it.

Two design payoffs:

1. **The agent always knows where to write.** "Write to `attempts/wip/`" is the stable instruction across attempts; the framework re-aims the link without the agent needing to know the current attempt number.
2. **Renames are eliminated.** Older versions of the framework renamed directories at attempt boundaries (`attempts/wip/` → `attempts/03/`) and hit Windows EPERM errors when file handles were still open. The symlink-over-real-dir approach makes the numbered directories the ground truth and the symlink the indirection — the real directory never moves.

## How the agent uses the folder during an attempt

Inside an attempt, the agent reads the framework-written inputs and produces outputs alongside them. The patterns are:

- **Reads `TASK.md`** to know what to do.
- **Reads `CHECK.md`** to know what "done" looks like.
- **Reads `NEEDS.md` and `data/needs.json`** to see which inputs were resolved and where they live.
- **Writes `TASK.result.md`** as a structured account of what it did. This becomes the cross-attempt audit trail.
- **Runs the actual work** — modifies project files, runs commands, calls tools. Tool calls land in `logs/<timestamp>_<runid>.log` and `.index.jsonl` automatically.

The agent doesn't need a special API for any of this. It's reading files with `Read`, writing them with `Write`, running shell commands with `Bash`. The framework supplies the directory and the file conventions; the agent works in plain filesystem terms.

## Reading prior attempts — the part that changes everything

When an attempt starts, the framework hands the agent its working directory at `attempts/wip/`. The agent can also read everything else under `attempts/` — including all prior attempts on the same task.

This is the capability the page title describes. The agent isn't restricted to its own attempt. It can:

- **Read `attempts/01/TASK.result.md`** to see what the previous agent claimed to do.
- **Read `attempts/01/CHECK.result.md`** to see which checks failed and with what output.
- **Read `attempts/01/logs/events.jsonl`** to see the lifecycle events of the previous run.
- **Read `attempts/01/logs/<timestamp>.log`** to see every tool call the previous agent made, with full inputs and outputs.

That last one is the most powerful. When attempt 2 of a task starts, the agent can literally read the transcript of what attempt 1's agent tried, including every Bash command, every file Read, every Edit, and what each one returned. "What did the previous agent already learn?" stops being a question the framework has to summarize — the new agent can read the source material directly.

Concrete example. Suppose attempt 1 of a task ran 30 grep commands trying to find a config field. Attempt 2 starts. Without prior-attempt access, attempt 2 starts from scratch — possibly running the same 30 grep commands. With prior-attempt access, attempt 2 reads `attempts/01/logs/<timestamp>.log`, sees that the field doesn't exist anywhere in the codebase, and pivots to a different approach without re-grepping.

## What the framework explicitly carries forward

The attempt-folder access is the *general* mechanism. Two specific signals are also actively propagated by the framework, so the agent doesn't have to discover them.

### `LEARN.md` — failure analysis from the previous attempt

After a failed attempt, the framework calls `generateLearnMd` (`packages/core/src/task/lifecycle/learn.ts:102`) to synthesize a structured analysis: which checks failed, what their output was, what files the agent touched, what hypotheses about the cause are worth pursuing. The result is written to `attempts/<NN>/LEARN.md` of the failed attempt.

When the next attempt starts, the framework copies that LEARN.md forward into the new attempt's directory:

```typescript
// task-runner.ts:482
if (attemptNumber > 1) {
  const prevPadded = String(attemptNumber - 1).padStart(2, "0");
  const prevLearnMd = path.join(attemptsDir, prevPadded, "LEARN.md");
  if (existsSync(prevLearnMd)) {
    await copyFile(prevLearnMd, path.join(realAttemptDir, "LEARN.md"));
    console.log(`   📖 LEARN.md propagated → attempt #${attemptNumber}`);
  }
}
```

The agent's first instruction in the materialized TASK.md is to read LEARN.md if it exists. This makes the propagated analysis a guaranteed first read, not an optional discovery.

### `RESULT.md` — every attempt's outcome summary

After every attempt — success or failure — the framework writes a `RESULT.md` summarizing the attempt: outcome, duration, completion timestamp, file diff, check results. This sits at `attempts/<NN>/RESULT.md` and survives forever. When you (or the agent, or an operator) want to know "what happened in attempt 3?" without reading the whole log, `RESULT.md` is the answer.

These two files are how the framework participates in cross-attempt context. Everything else is the agent reading the directory tree directly.

## What this composes with

The attempt folder pattern interacts with three other framework primitives in ways that make each more useful than it would be alone.

**Per-attempt isolation** ([Runtime hygiene](./05-runtime-hygiene)). Each attempt's folder is the boundary that makes "fresh attempt" mean something. Attempt 2 doesn't inherit attempt 1's working state — only the explicit propagation channels (LEARN.md, the directory tree). Without isolation, "previous attempt" would be conceptually meaningless because everything would bleed together.

**Input snapshot and file diff** ([Input snapshot and file diff](./03-input-snapshot-and-diff)). Each attempt captures `before.json` (filesystem state before the agent ran) and `after.json` (the diff after). When a later attempt reads a prior attempt's directory, it can see exactly what changed in that attempt — not as a free-form claim from the agent, but as a structured filesystem diff. "What did attempt 1 actually create?" is answered by reading one JSON file.

**The strategy catalog** ([The strategy catalog](./04-strategy-catalog)). Repair strategies declare what context they need via `contextSteps`. When a strategy needs prior-attempt artifacts ("read the previous attempt's check output"), it can ask for them by file path. The strategy code doesn't reach for in-process memory — it asks the framework to load a file. Same files the agent can read. Same source of truth.

## How this compares

**Git's working tree + history.** A git repository has a current working tree and a history of past states (commits). You can `git checkout <sha>` to read any past state. The Converge attempt folder is the same idea applied to single-task execution: `attempts/wip/` is the working tree, `attempts/01/`, `02/`, `03/` are the history, and the agent can `Read` any of them.

**Build systems' incremental cache directories.** `target/`, `dist/`, `.next/cache/` — every modern build tool keeps per-build artifacts on disk so the next build can introspect what the previous one did. Converge's attempt folders are the same shape applied to agent execution. The artifacts aren't binaries; they're transcripts and check results. The principle is identical: persist enough to make the next run smarter.

**Process workspaces in workflow engines.** Temporal, Airflow, and similar frameworks usually pass state between activities as serializable values. The agent equivalent — passing transcripts between attempts as model context — runs into context-window limits and loses fidelity. Converge sidesteps both by making the workspace a directory the agent can navigate with the same tools it uses for everything else: `Read`, `Glob`, `Bash`. No special protocol for accessing history.

## What this gives up

The attempt folders are durable, not garbage-collected. A long-running playbook with many retries can accumulate substantial disk usage — typically a few hundred KB per attempt for the structured artifacts, plus whatever the per-spawn logs grow to (tool-call indexes for a verbose attempt can hit several MB).

The framework treats this as the right tradeoff: disk is cheap, debugging time isn't. Operators who need to reclaim space can manually delete old attempt directories without affecting the framework's correctness — the active attempt is `wip/`, and prior attempts are reference material, not load-bearing state.

The flip side: because prior attempts persist, agents can also read attempts they shouldn't. A cautious agent that examines `attempts/01/` to "see how the predecessor did things" can talk itself into reproducing the predecessor's mistakes. The discipline of "look back to learn, not to copy" is on the agent side. The framework provides access; whether to use it well is a prompt-engineering and skill-design concern.

## When this matters for your work

You'll feel the attempt folder the first time a task fails repeatedly and you spelunk through `attempts/01/`, `02/`, `03/` to see the diff between them. The framework's not summarizing for you — you're reading the actual artifacts. That's a substantively different debugging experience than scrolling through a single linear log.

You'll feel it again when you write a custom repair strategy or skill. Instead of inventing a state-passing protocol, you read prior-attempt files. The pattern is mundane — `readFile('../01/CHECK.result.md')` — but it scales to arbitrary cross-attempt analysis without expanding the framework surface.

You'll feel it most when an agent on attempt 3 reads attempt 2's tool-call log, recognizes a pattern in what it tried, and pivots cleanly. That's the agent doing its own diagnostic work, with the framework just supplying access. No special context-passing API; no model-context bloat; no fidelity loss between what was tried and what the next attempt sees.

## Where this lives

- `packages/core/src/journal/structure.ts` — `getTaskAttemptDir` (line 77) computes `attempts/<NN>/` paths. Padding to two digits at line 85 keeps the directory listing chronologically ordered.
- `packages/core/src/task/lifecycle/task-runner.ts` — attempt setup at lines 392–489: creates the real numbered directory, removes/migrates any prior `wip/`, creates the symlink, copies LEARN.md forward.
- `packages/core/src/task/lifecycle/context-snapshot.ts` — writes the attempt's input files (`TASK.md`, `CHECK.md`, `NEEDS.md`, `data/`) at attempt start. The standard layout the agent reads from.
- `packages/core/src/task/lifecycle/result-snapshot.ts` — writes `TASK.result.md`, `CHECK.result.md`, `NEEDS.result.md`, and `RESULT.md` at attempt end. The standard layout the agent (and the next attempt's agent) read for outcomes.
- `packages/core/src/task/lifecycle/learn.ts` — `generateLearnMd` (line 102): synthesizes the carry-forward analysis after a failed attempt.

That closes the Advanced category. The pieces compose: [the navigator graph](./01-navigator-graph) and [JIT construction](./02-jit-graph-construction) are the runtime; [input snapshot and diff](./03-input-snapshot-and-diff) grounds it in filesystem truth; [the strategy catalog](./04-strategy-catalog) handles failures by routing rather than dispatching; [runtime hygiene](./05-runtime-hygiene) makes everything safe to interrupt; and the attempt folder turns each task run into a navigable, inspectable workspace that the agent itself can reason about — including across prior attempts.
