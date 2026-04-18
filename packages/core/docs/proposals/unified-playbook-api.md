# Proposal: Unified Playbook API

**Status**: Draft
**Date**: 2026-04-12

---

## One Sentence

Replace the separate `workflow` and `run` APIs with a single **Playbook** concept — a named, reusable unit that defines both _what to do_ and _how to run it_, and can be executed many times or run indefinitely.

---

## Problem

Today, Converge has two overlapping systems:

### Workflow API (the "what")

```
.converge/workflows/react-app/
├── workflow.yml          ← DAG, inputs, task references
├── TASK.md
└── tasks/
    ├── 001-prepare/TASK.md
    └── 002-build/TASK.md
```

- `converge workflow run react-app --idea="todo app"` → generates an epic
- Then you **separately** run `converge run` to execute it
- Two commands, two mental models

### Run API (the "how")

```typescript
// Three overlapping config types:
AutonomousRunConfig  { projectDir, maxIterations, maxTaskAttempts, verbose, filter, force, resume, restart, ... }
ConvergeRunConfig    { projectDir, maxIterations, maxTaskAttempts, verbose, filter, force, resume, restart, planOnly, ... }
AutoRunOptions       { step, dry, analyze, converge, wbs, maxIterations, filter, force, resume, restart, unblock, ... }
```

- `converge run` — autonomous loop
- `converge run --converge` — wave-based convergence
- `converge run --step` — single task execution
- No identity, no history, no way to re-run the same thing

### Where they overlap

| Field            | WorkflowRunOptions | AutonomousRunConfig | ConvergeRunConfig | AutoRunOptions  |
| ---------------- | ------------------ | ------------------- | ----------------- | --------------- |
| projectDir / dir | ✓                  | ✓                   | ✓                 | ✓               |
| verbose          | ✓                  | ✓                   | ✓                 | ✓               |
| filter           | —                  | ✓                   | ✓                 | ✓               |
| force            | —                  | ✓                   | ✓                 | ✓               |
| resume           | —                  | ✓                   | ✓                 | ✓               |
| restart          | —                  | ✓                   | ✓                 | ✓               |
| maxIterations    | —                  | ✓                   | ✓                 | ✓               |
| maxTaskAttempts  | —                  | ✓                   | ✓                 | —               |
| maxRunDurationMs | —                  | ✓                   | ✓                 | ✓ (maxDuration) |
| convergeConfig   | —                  | ✓                   | ✓                 | ✓               |
| hookRegistry     | —                  | ✓                   | ✓                 | ✓               |

The workflow defines _what_ but not _how_. The run defines _how_ but not _what_. Neither has identity or history. Users must manually chain them together.

---

## Solution: Playbook

A **playbook** is a single definition that combines:

1. **What** — task templates, DAG, inputs (from workflows)
2. **How** — execution mode, limits, convergence settings (from run config)
3. **Identity** — a name and key that make it trackable across runs
4. **History** — execution records that accumulate over time (from the workflow journal proposal)

### playbook.yml

```yaml
name: react-app
description: Build a React app from an idea

# ── WHAT (replaces workflow.yml) ──────────────────────
inputs:
  idea:
    required: true
    description: The app idea to build
key: idea

tasks:
  - id: 001-prepare-requirements
  - id: 002-foundation
    depends_on: [001-prepare-requirements]
  - id: 003-build-screens
    depends_on: [002-foundation]
  - id: 004-add-behavior
    depends_on: [003-build-screens]
  - id: 005-remediation
    depends_on: [004-add-behavior]

# ── HOW (replaces run config) ─────────────────────────
run:
  mode: autonomous # autonomous | converge | step
  maxIterations: 100
  maxTaskAttempts: 3
  maxDuration: 60m # human-readable duration
  resume: true # auto-resume on crash
```

### Directory structure

```
.converge/playbooks/react-app/
├── playbook.yml                ← unified definition
├── TASK.md                     ← epic definition (optional)
└── tasks/
    ├── 001-prepare-requirements/TASK.md
    ├── 002-foundation/TASK.md
    ├── 003-build-screens/TASK.md
    ├── 004-add-behavior/TASK.md
    └── 005-remediation/TASK.md
```

---

## Key Design Decisions

### 1. The default `converge run` is an implicit playbook

Today's `converge run` discovers tasks from the filesystem and executes them. Under the playbook model, this is simply the **default playbook** — an unnamed playbook that discovers its task list from `.converge/epics/`.

```bash
# These are equivalent:
converge run                          # implicit default playbook
converge playbook run default         # explicit default playbook
```

The default playbook has no `playbook.yml`. Its "what" comes from filesystem discovery (existing behavior). Its "how" comes from CLI flags and `PROJECT.md` runtime config (existing behavior).

### 2. Named playbooks are self-contained

A named playbook bundles everything needed to run:

```bash
converge playbook run react-app --idea="expense tracker"
```

This single command:

1. Loads `playbook.yml` (definition + run config)
2. Resolves inputs → generates epicId
3. Instantiates task templates into `.converge/epics/{epicId}/`
4. Executes using the playbook's `run:` config
5. Records execution in `journal/playbooks/{name}/`

No separate `workflow run` then `run`. One command, one concept.

### 3. Long-running playbooks

A playbook can define `run.maxDuration: infinite` (or omit it) to run indefinitely. This supports use cases like:

- Continuous monitoring / self-healing loops
- Long-running data processing pipelines
- Self-development loops that run until convergence

```yaml
name: self-dev
description: Continuously improve the framework
run:
  mode: converge
  maxDuration: infinite # runs until manually stopped or converged
  resume: true # picks up where it left off after crash
```

### 4. Playbooks can compose other playbooks

A playbook's task list can reference other playbooks:

```yaml
name: self-dev
tasks:
  - playbook: react-app # runs the inner playbook as a step
    with:
      idea: ${idea}
  - id: evaluate # then runs evaluation tasks
  - id: diagnose
    depends_on: [evaluate]
  - id: fix
    depends_on: [diagnose]
  - playbook: react-app # re-runs to verify
    with:
      idea: ${idea}
```

This replaces the `workflow: react-app` reference from the workflow journal proposal with a consistent `playbook:` reference.

---

## Unified Type System

### PlaybookDef (replaces WorkflowDef + RunConfig)

```typescript
interface PlaybookDef {
  /** Unique playbook name */
  name: string;

  /** Human-readable description */
  description?: string;

  /** Input that distinguishes runs on the board */
  key?: string;

  /** Input variables the playbook accepts */
  inputs?: Record<string, PlaybookInput>;

  /** Task DAG — ordering and dependencies */
  tasks: PlaybookTaskRef[];

  /** Execution configuration */
  run?: PlaybookRunConfig;

  /** Post-execution checks */
  checks?: PlaybookCheck[];
}
```

### PlaybookRunConfig (replaces AutonomousRunConfig + ConvergeRunConfig overlap)

```typescript
interface PlaybookRunConfig {
  /** Execution mode */
  mode?: "autonomous" | "converge" | "step";

  /** Maximum task executions before stopping */
  maxIterations?: number;

  /** Max attempts per individual task */
  maxTaskAttempts?: number;

  /** Wall-clock timeout (ms or human-readable in YAML: "60m", "2h") */
  maxDuration?: number;

  /** Auto-resume on crash */
  resume?: boolean;

  /** Maximum goals for converge mode */
  maxGoals?: number;
}
```

### PlaybookTaskRef (extends WorkflowTaskRef)

```typescript
interface PlaybookTaskRef {
  /** Task directory name (for template tasks) */
  id?: string;

  /** Reference to another playbook (for composition) */
  playbook?: string;

  /** Input vars to pass to referenced playbook */
  with?: Record<string, string>;

  /** Task IDs that must complete before this task runs */
  depends_on?: string[];
}
```

### PlaybookExecution (replaces AutonomousRunResult + ConvergeResult)

```typescript
interface PlaybookExecution {
  /** Unique execution ID */
  executionId: string;

  /** Playbook name */
  playbook: string;

  /** Resolved input variables */
  inputs: Record<string, string>;

  /** Execution timing */
  startTime: string;
  endTime?: string;
  durationMs?: number;

  /** Outcome */
  status: "running" | "complete" | "failed" | "cancelled" | "stalled";

  /** Task metrics */
  tasksTotal: number;
  tasksCompleted: number;
  tasksFailed: number;
  totalAttempts: number;

  /** Convergence metrics (converge mode only) */
  waves?: number;
  startScore?: number;
  endScore?: number;
  converged?: boolean;
}
```

---

## CLI

### Before (two systems)

```bash
# Workflow system
converge workflow list
converge workflow info react-app
converge workflow run react-app --idea="todo app"

# Then separately:
converge run                          # execute everything
converge run --converge               # with convergence
converge run --step                   # one task at a time
converge run --filter fix-issue-42    # filter to a specific epic
```

### After (one system)

`--playbook` is a flag on `converge run`. Playbook is a wrapper layer — all existing
run flags work with or without it.

```bash
# Run with a named playbook (generate epic + execute)
converge run --playbook=react-app --idea="todo app"
converge run --playbook=react-app --idea="todo" --converge --max-iterations=50

# Default run (no playbook — existing behavior, unchanged)
converge run                                      # autonomous loop
converge run --converge                           # convergence mode
converge run --step                               # one task at a time

# Playbook inspection (separate subcommand)
converge playbook list                            # list available playbooks
converge playbook info react-app                  # show details + run config
converge playbook history react-app               # list past executions
```

### CLI flags override playbook.yml

The `run:` section in `playbook.yml` provides defaults. CLI flags override them:

```yaml
# playbook.yml says:
run:
  mode: autonomous
  maxIterations: 100
```

```bash
# CLI overrides:
converge run --playbook=react-app --converge --max-iterations=50
```

This mirrors how most tools work (config file defaults, CLI overrides).

---

## Migration Path

### Phase 1: Add playbook support alongside existing APIs

- Add `PlaybookDef` type and `playbook.yml` parser
- Add `converge playbook run` command
- Internally, `playbook run` calls `generateEpicFromWorkflow` + `autonomousRun`/`convergeRun`
- Existing `converge workflow run` and `converge run` continue to work

### Phase 2: Wire `converge run` to the default playbook

- `converge run` becomes shorthand for `converge playbook run default`
- All `AutoRunOptions` map to `PlaybookRunConfig` + CLI overrides
- `PROJECT.md` runtime config feeds the default playbook's `run:` section

### Phase 3: Deprecate workflow commands

- `converge workflow run` prints deprecation notice, delegates to `converge playbook run`
- `converge workflow list` → `converge playbook list`
- Rename `.converge/workflows/` to `.converge/playbooks/` (support both during transition)

### Phase 4: Remove old APIs

- Remove `WorkflowDef`, `WorkflowRunOptions` types
- Remove `commands-workflow.ts`
- Remove `workflow/` module (functionality absorbed into `playbook/`)

---

## Journal Restructuring

This is the critical structural question: if epics become playbooks (each playbook = an isolated task set), **how does the journal change to match?**

### Current journal (the problem)

Today's journal has two top-level buckets with no playbook awareness:

```
.converge/journal/
├── sessions/                              ← anonymous session logs
│   ├── 2026-04-11T21-58-54-44ve1g/
│   │   └── metadata.json                 ← { sessionId, projectName, outcomes }
│   ├── 2026-04-12T02-07-54-m8znlm/       ← no playbookId, no executionId
│   ├── 2026-04-12T05-08-43-srjvtt/       ← which playbook produced this? unknown.
│   └── ...  (7 sessions, no grouping)
│
└── epics/                                 ← ALL epics from ALL playbooks, one flat bucket
    ├── 001-gather-idea/checkpoint.json    ← stale flat checkpoints (legacy)
    ├── 002-generate-prd/checkpoint.json
    ├── 01-prepare-requirements/           ← epic from default playbook
    │   ├── 001-gather-idea/attempts/01/
    │   ├── 002-generate-prd/attempts/01/
    │   └── ...
    ├── 02-design-system/                  ← epic from default playbook
    │   ├── 002-generate-design-system/
    │   └── 005-generate-design-references/
    ├── 03-build-screens/                  ← epic from default playbook (deep WBS)
    │   ├── attempts/01/, 02/, 03/, 04/
    │   ├── 001-today/tasks/001-01-plan/...
    │   ├── tasks/001-today/tasks/001-05-lift/attempts/01/
    │   └── ...
    └── 05-add-behavior/                   ← (not yet journaled — no tasks dir)
```

Problems:

1. **No playbook identity** — sessions don't know which playbook spawned them
2. **All epics in one bucket** — `journal/epics/` mixes epics from every playbook
3. **No cross-run tracking** — can't compare run #1 vs run #5 of the same playbook
4. **No execution grouping** — a single `converge run` may touch multiple sessions, but there's no "execution" wrapper

### New journal structure

The journal mirrors the playbook model: each playbook owns its execution data.

```
.converge/journal/
│
├── playbooks/
│   │
│   ├── _default/                                    ← the implicit default playbook
│   │   ├── playbook.json                            ← { name, created, lastRun }
│   │   ├── trends.jsonl                             ← one line per execution
│   │   ├── facts.jsonl                              ← facts across all executions
│   │   ├── gaps.jsonl                               ← gaps across all executions
│   │   │
│   │   └── executions/
│   │       ├── exec-2026-04-11T21-58/               ← first run
│   │       │   ├── metadata.json                    ← PlaybookExecution
│   │       │   ├── session/                         ← session data (moved from sessions/)
│   │       │   │   ├── metadata.json
│   │       │   │   ├── events.jsonl
│   │       │   │   └── progress.jsonl
│   │       │   └── epics/                           ← epic journals scoped to THIS run
│   │       │       ├── 01-prepare-requirements/
│   │       │       │   ├── 001-gather-idea/
│   │       │       │   │   ├── checkpoint.json
│   │       │       │   │   ├── attempts/01/
│   │       │       │   │   │   ├── TASK.md
│   │       │       │   │   │   ├── LEARN.md
│   │       │       │   │   │   ├── data/
│   │       │       │   │   │   └── logs/
│   │       │       │   │   └── logs/facts.jsonl
│   │       │       │   └── 002-generate-prd/...
│   │       │       ├── 02-design-system/...
│   │       │       └── 03-build-screens/
│   │       │           ├── attempts/01/, 02/
│   │       │           └── tasks/001-today/tasks/...
│   │       │
│   │       └── exec-2026-04-12T05-08/               ← second run
│   │           ├── metadata.json
│   │           ├── session/
│   │           └── epics/
│   │
│   ├── react-app/                                   ← named playbook
│   │   ├── playbook.json
│   │   ├── trends.jsonl
│   │   ├── facts.jsonl
│   │   ├── gaps.jsonl
│   │   └── executions/
│   │       ├── react-app-todo-app/                  ← executionId derived from key
│   │       │   ├── metadata.json
│   │       │   ├── session/
│   │       │   └── epics/
│   │       └── react-app-expense-tracker/
│   │           └── ...
│   │
│   └── fix-issue/                                   ← another named playbook
│       ├── playbook.json
│       ├── trends.jsonl
│       └── executions/
│           ├── fix-issue-42/
│           ├── fix-issue-43/
│           └── fix-issue-44/
│
└── _legacy/                                         ← migrated old data (read-only)
    ├── sessions/...
    └── epics/...
```

### Key changes

**1. `journal/epics/` → `journal/playbooks/{name}/executions/{id}/epics/`**

Epic journals move inside their execution. The internal structure (`{epicId}/{taskId}/attempts/{n}/`) is unchanged — only the root path changes.

This means `getJournalStructure()` needs one new input: the active playbook + execution context.

```typescript
// Before:
getJournalStructure(projectDir, epicId, taskId);
// → .converge/journal/epics/{epicId}/{taskId}/...

// After:
getJournalStructure(projectDir, epicId, taskId, { playbook, executionId });
// → .converge/journal/playbooks/{playbook}/executions/{executionId}/epics/{epicId}/{taskId}/...
```

The context can be provided explicitly or read from environment variables (`CONVERGE_PLAYBOOK`, `CONVERGE_EXECUTION_ID`) — same pattern as `CONVERGE_TASK_ATTEMPT`.

**2. `journal/sessions/` → `journal/playbooks/{name}/executions/{id}/session/`**

Session data moves inside the execution. A single execution = a single session. No more anonymous session directories.

**3. Playbook-level aggregation files**

Each playbook gets cross-execution files:

| File            | Purpose                                                     |
| --------------- | ----------------------------------------------------------- |
| `playbook.json` | Playbook metadata (name, created, last run time)            |
| `trends.jsonl`  | One line per execution — task counts, duration, convergence |
| `facts.jsonl`   | Facts from all executions (tagged with executionId)         |
| `gaps.jsonl`    | Gaps from all executions (tagged with executionId)          |

These enable cross-run queries: "which checks regressed?", "are gap counts trending down?", "average execution time?"

**4. The default playbook**

`_default` is the implicit playbook for `converge run` with no named playbook. It groups what today are anonymous sessions + flat epic journals into a structured execution history.

### How `getJournalStructure()` changes

The current function signature:

```typescript
function getJournalStructure(
  projectDir: string,
  epicId?: string,
  taskId?: string,
): JournalStructure;
```

Becomes:

```typescript
interface PlaybookContext {
  playbook: string; // playbook name or '_default'
  executionId: string; // execution ID within the playbook
}

function getJournalStructure(
  projectDir: string,
  epicId?: string,
  taskId?: string,
  ctx?: PlaybookContext, // new optional param — defaults from env vars
): JournalStructure;
```

When `ctx` is omitted, falls back to:

- `process.env.CONVERGE_PLAYBOOK` → playbook name
- `process.env.CONVERGE_EXECUTION_ID` → execution ID
- If neither set → legacy mode (reads from `journal/epics/` directly for backwards compat)

This keeps the existing call sites working during migration.

### Migration from current journal

For example2's existing journal:

```
# Before (today):
journal/sessions/2026-04-12T05-08-43-srjvtt/metadata.json
journal/epics/03-build-screens/tasks/001-today/tasks/001-05-lift/checkpoint.json

# After (migrated):
journal/playbooks/_default/executions/exec-2026-04-12T05-08/session/metadata.json
journal/playbooks/_default/executions/exec-2026-04-12T05-08/epics/03-build-screens/tasks/001-today/tasks/001-05-lift/checkpoint.json
journal/_legacy/sessions/...     ← old data preserved read-only
journal/_legacy/epics/...        ← old data preserved read-only
```

A one-time migration script moves existing session + epic journals into the `_default` playbook. Old paths are kept in `_legacy/` so nothing breaks during transition.

### Per-execution metadata.json

```json
{
  "executionId": "exec-2026-04-12T05-08",
  "playbook": "_default",
  "startTime": "2026-04-12T05:08:43.614Z",
  "endTime": "2026-04-12T05:10:06.647Z",
  "durationMs": 83033,
  "status": "complete",
  "inputs": {},
  "tasksTotal": 24,
  "tasksCompleted": 22,
  "tasksFailed": 2,
  "totalAttempts": 31,
  "sessionId": "2026-04-12T05-08-43-srjvtt",
  "waves": null,
  "converged": null
}
```

### Playbook-level trends.jsonl

```jsonl
{"executionId":"exec-2026-04-11T21-58","timestamp":"2026-04-11T22:15:00Z","tasksTotal":12,"tasksComplete":12,"tasksFailed":0,"totalAttempts":14,"durationMs":960000}
{"executionId":"exec-2026-04-12T02-07","timestamp":"2026-04-12T02:25:00Z","tasksTotal":24,"tasksComplete":22,"tasksFailed":2,"totalAttempts":31,"durationMs":1053000}
{"executionId":"exec-2026-04-12T05-08","timestamp":"2026-04-12T05:10:06Z","tasksTotal":24,"tasksComplete":22,"tasksFailed":2,"totalAttempts":31,"durationMs":83033}
```

---

## Examples

### Simple one-off playbook (replaces `converge run`)

```yaml
# No playbook.yml needed — this is the implicit default.
# Just run:
converge run
```

### Repeatable pipeline (replaces workflow)

```yaml
# .converge/playbooks/fix-issue/playbook.yml
name: fix-issue
description: Fix a GitHub issue end-to-end
inputs:
  issue: { required: true, description: "Issue number" }
key: issue
tasks:
  - id: 001-investigate
  - id: 002-plan
    depends_on: [001-investigate]
  - id: 003-implement
    depends_on: [002-plan]
  - id: 004-test
    depends_on: [003-implement]
  - id: 005-pr
    depends_on: [004-test]
run:
  mode: autonomous
  maxTaskAttempts: 3
  maxDuration: 30m
```

```bash
converge playbook run fix-issue --issue=42
converge playbook run fix-issue --issue=43
converge playbook run fix-issue --issue=44
# Each creates a separate execution, tracked in journal/playbooks/fix-issue/
```

### Long-running self-development loop

```yaml
# .converge/playbooks/self-dev/playbook.yml
name: self-dev
description: Run react-app, evaluate, diagnose, fix, re-run
inputs:
  idea: { required: true }
key: idea
tasks:
  - playbook: react-app
    with: { idea: "${idea}" }
  - id: evaluate
  - id: diagnose
    depends_on: [evaluate]
  - id: fix
    depends_on: [diagnose]
  - playbook: react-app
    with: { idea: "${idea}" }
run:
  mode: converge
  maxDuration: infinite
  resume: true
checks:
  - id: builds-clean
    cmd: "tsc --noEmit && npm run build"
  - id: all-tests-pass
    cmd: "npm test"
```

```bash
converge playbook run self-dev --idea="expense tracker"
# Runs until converged or manually stopped.
# Resume after crash:
converge playbook run self-dev --idea="expense tracker"
# Picks up where it left off (same epicId from key).
```

---

## What Changes, What Doesn't

| Layer                     | Changes?         | Details                                                                                                  |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| **TASK.md**               | No               | Tasks are still TASK.md files. Playbooks don't change task format.                                       |
| **Epic definitions**      | No               | `.converge/epics/` still holds instantiated task definitions.                                            |
| **Discovery**             | No               | `DiscoveryScanner` still finds tasks via globs.                                                          |
| **Task execution**        | No               | `executeTask`, `Unit`, convergence loops unchanged.                                                      |
| **autonomousRun**         | Minimal          | Called by playbook executor instead of directly by CLI.                                                  |
| **convergeRun**           | Minimal          | Called by playbook executor instead of directly by CLI.                                                  |
| **Workflow types**        | Replaced         | `WorkflowDef` → `PlaybookDef`, `WorkflowSource` → `PlaybookSource`.                                      |
| **Workflow loader**       | Replaced         | `parseWorkflowYml` → `parsePlaybookYml`, same logic + `run:` section.                                    |
| **Workflow executor**     | Extended         | `generateEpicFromWorkflow` → `runPlaybook` (generate + execute).                                         |
| **CLI commands**          | Unified          | `commands-workflow.ts` + run parts of `commands-run.ts` → `commands-playbook.ts`.                        |
| **Journal structure**     | **Restructured** | `journal/epics/` → `journal/playbooks/{name}/executions/{id}/epics/`. Epic internal structure unchanged. |
| **Journal sessions**      | **Moved**        | `journal/sessions/` → `journal/playbooks/{name}/executions/{id}/session/`. One session per execution.    |
| **Journal aggregation**   | **New**          | `journal/playbooks/{name}/trends.jsonl`, `facts.jsonl`, `gaps.jsonl` for cross-run tracking.             |
| **getJournalStructure()** | Extended         | New optional `PlaybookContext` param. Defaults from env vars. Legacy mode when unset.                    |

---

## Summary

| Before                                                 | After                                            |
| ------------------------------------------------------ | ------------------------------------------------ |
| `WorkflowDef` defines what                             | `PlaybookDef` defines what + how                 |
| `AutonomousRunConfig` / `ConvergeRunConfig` define how | `PlaybookRunConfig` inside `PlaybookDef`         |
| `converge workflow run` + `converge run` (two steps)   | `converge playbook run` (one step)               |
| No execution identity                                  | `journal/playbooks/{name}/` tracks all runs      |
| No composition                                         | Playbooks can reference other playbooks          |
| `converge run` is anonymous                            | `converge run` = default playbook (with history) |
| Three overlapping config types                         | One `PlaybookDef` + CLI overrides                |

The playbook is the single abstraction for "something you run in Converge." It can be a one-off task board, a repeatable pipeline, or a long-running convergence loop. Define it once, run it many times, track it forever.
