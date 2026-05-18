# Converge Playbooks

A playbook is the root unit of organization in Converge. Everything — tasks, goals, journal, sessions — lives under a playbook.

There are two patterns:

| Pattern        | Description                                                                                                                                                             | Example                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Continuous** | Long-lived, tasks evolve over time. You add, remove, and update tasks as the project grows. Runs many times over the same task set.                                     | App development, default playbook  |
| **Keyed**      | Runs many times with different inputs. Each run generates a fresh task set via top-level CLI seeding based on the key. The playbook is a template and the seeded task is the entry point. | Fix issue, review PR, process data |

## Continuous Playbook

The default pattern. You author tasks manually (or let Seed parents spawn them). The playbook runs repeatedly — each run picks up where the last left off.

```
playbooks/default/
├── playbook.yml
├── tasks/
│   ├── 01-prepare/TASK.md           ← authored once
│   ├── 02-build/
│   │   ├── TASK.md                  ← Seed parent (`seed: { mode: cli }`)
│   │   └── tasks/                   ← subtasks accumulate over runs
│   │       ├── 001-homepage/
│   │       └── 002-dashboard/
│   └── 03-test/TASK.md
└── goals/
    └── 001-typescript-errors/
```

```bash
converge run                          # first run — executes 01, 02 spawns subtasks, 03
converge run                          # second run — picks up where it left off
converge run --converge               # converge until goals pass
```

The task set is stable. Tasks are added by humans or by seeded parent tasks that emit `converge spawn ...` commands at runtime. The journal tracks progress across runs.

## Keyed Playbook

A template that generates a fresh task pipeline for each input. The playbook itself has a top-level seeded task. Each `--key=value` run triggers that task to emit the specific `converge spawn ...` commands for the key.

```
playbooks/fix-issue/
├── playbook.yml
├── tasks/
│   └── seed/
│       └── TASK.md                   ← top-level seeded task
└── templates/                       ← optional: reusable task templates
    ├── investigate.md
    ├── implement.md
    └── verify.md
```

```yaml
# playbook.yml
name: fix-issue
description: Fix a GitHub issue end-to-end

inputs:
  issue:
    required: true
    description: Issue number
key: issue

run:
  mode: autonomous
  maxDuration: 30m
```

```yaml
# tasks/seed/TASK.md
---
id: seed
title: Generate issue-specific task pipeline
seed:
  mode: cli
---

Read the requested issue and emit only explicit `converge spawn task` commands.
Spawn at least:
- `001-investigate`
- `002-implement`
- `003-verify`
```

```bash
converge .converge/playbooks/fix-issue/playbook.yml run --issue=42    # spawns 3 tasks for issue 42
converge .converge/playbooks/fix-issue/playbook.yml run --issue=43    # spawns 3 tasks for issue 43
converge .converge/playbooks/fix-issue/playbook.yml run --issue=44    # spawns 3 tasks for issue 44
converge playbook history fix-issue             # shows all 3 runs
```

Each run is independent. The seeded task reads the issue, decides what tasks to create, and emits `converge spawn ...` commands. The journal tracks each run separately in `journal/fix-issue/`.

### More keyed playbook examples

**PR Review:**

```yaml
name: review-pr
inputs:
  pr: { required: true }
key: pr
seed:
  mode: cli
```

The seeded task reads the PR diff and emits tasks per changed file or concern area.

**Data Pipeline:**

```yaml
name: process-batch
inputs:
  batch: { required: true }
key: batch
seed:
  mode: cli
```

The seeded task reads the batch manifest and emits one task per data file.

## Key Difference

|          | Continuous                       | Keyed                               |
| -------- | -------------------------------- | ----------------------------------- |
| Tasks    | Authored manually + Seed children | Generated entirely by top-level seeded task |
| Identity | One long-lived task set          | Fresh task set per key              |
| Runs     | Same tasks, advancing progress   | Different tasks each time           |
| Seed      | Optional, at task level          | Required, at playbook entry task    |
| Journal  | Single timeline                  | One timeline per key run            |
| Example  | `converge run`                   | `converge .converge/playbooks/X/playbook.yml run --key=Y` |

## Directory Structure

Every playbook has the same shape. The `default` playbook is your main project.

```
.converge/
├── playbooks/
│   ├── default/                        ← your main project
│   │   ├── playbook.yml                ← config + run settings
│   │   ├── tasks/                      ← task definitions (TASK.md files)
│   │   │   ├── 01-prepare/
│   │   │   │   ├── TASK.md
│   │   │   │   └── tasks/              ← spawned subtasks
│   │   │   ├── 02-build/
│   │   │   └── 03-test/
│   │   └── goals/                      ← convergence goals (optional)
│   │       └── 001-typescript-errors/
│   │
│   └── fix-issue/                      ← keyed playbook
│       ├── playbook.yml
│       ├── tasks/
│       │   └── seed/
│       │       └── TASK.md              ← generates tasks per key (issue #)
│       └── templates/                  ← optional reusable templates
│
├── skills/                             ← shared across all playbooks
│
└── journal/
    ├── default/                        ← journal for default playbook
    │   ├── playbook.json               ← { name, created, lastRun, totalRuns }
    │   ├── trends.jsonl                ← one line per run
    │   ├── tasks/                      ← task execution records
    │   │   └── 01-prepare/
    │   │       ├── checkpoint.json
    │   │       └── attempts/01/
    │   └── sessions/                   ← session logs
    │       └── 2026-04-12T05-08-43/
    │           ├── metadata.json
    │           ├── events.jsonl
    │           └── progress.jsonl
    │
    └── fix-issue/                      ← journal for fix-issue playbook
        ├── playbook.json
        ├── trends.jsonl
        ├── tasks/
        └── sessions/
```

## playbook.yml

Defines what the playbook does and how it runs.

```yaml
name: fix-issue
description: Investigate, fix, test, and commit a bug fix

# Inputs — passed as --key=value on the CLI
inputs:
  issue:
    description: Issue number or URL
    required: true
  branch:
    description: Git branch name
    default: fix/${issue}

# Key — used to generate unique task IDs per run
# fix-issue --issue=42 → epic ID "fix-issue-42"
key: issue

# Task pipeline — each TASK.md declares its own depends_on
tasks:
  - path: 001-investigate
  - path: 002-implement
  - path: 003-verify
  - path: 004-commit

# Run configuration — how the playbook executes
run:
  mode: autonomous # autonomous | converge | step
  maxIterations: 100
  maxTaskAttempts: 3
  maxDuration: 30m # supports: 30m, 2h, 90s, 1h30m, infinite
  resume: true

# Post-execution checks
checks:
  - id: tests-pass
    cmd: npm test
```

## CLI Usage

### Running a playbook

```bash
# Run a named playbook
converge run --playbook=fix-issue --issue=42

# All existing run flags compose with --playbook
converge run --playbook=fix-issue --issue=42 --converge
converge run --playbook=fix-issue --issue=42 --step --dry
converge run --playbook=fix-issue --issue=42 --max-iterations=50

# Run without specifying a playbook — uses the default playbook
converge run
converge run --converge
converge run --step
```

Use `--playbook=NAME` to target a specific playbook. All existing flags compose with it. The playbook's `run:` config provides defaults, CLI flags override them.

### Inspecting playbooks

```bash
# List available playbooks
converge playbook list

# Show details (inputs, task DAG, run config, checks)
converge playbook info fix-issue

# Show execution history
converge playbook history fix-issue
```

### Scoping other commands to a playbook

Path-based execution works with any command — it scopes journal reads to that playbook.

```bash
converge .converge/playbooks/fix-issue/playbook.yml status
converge .converge/playbooks/fix-issue/playbook.yml inspect
converge .converge/playbooks/fix-issue/playbook.yml metrics
converge .converge/playbooks/fix-issue/playbook.yml show journal
```

## How It Works

**Continuous playbook** (`converge run`):

1. **Discover** — scans `playbooks/default/tasks/` for TASK.md files
2. **Execute** — runs autonomousRun (or convergeRun) across all discovered tasks
3. **Journal** — writes to `journal/default/tasks/` and `journal/default/sessions/`
4. **Resume** — next run picks up where the last left off

**Keyed playbook** (`converge .converge/playbooks/fix-issue/playbook.yml run --issue=42`):

1. **Load** — reads `playbooks/fix-issue/playbook.yml`
2. **Resolve** — substitutes `${issue}` → `42`, sets playbook context
3. **Seed** — runs the top-level seeded task, which emits `converge spawn ...` commands to generate the task pipeline for this specific issue
4. **Execute** — runs autonomousRun across the spawned tasks
5. **Journal** — writes to `journal/fix-issue/tasks/` and `journal/fix-issue/sessions/`
6. **Trend** — appends a line to `journal/fix-issue/trends.jsonl`

## Playbook Composition

A playbook can reference other playbooks in its task list:

```yaml
name: self-dev
tasks:
  - playbook: react-app
    with:
      idea: ${idea}
  - id: evaluate
  - id: diagnose
    depends_on: [evaluate]
  - playbook: react-app
    with:
      idea: ${idea}
```

## Inputs and Variable Substitution

Inputs declared in `playbook.yml` are resolved from CLI flags:

```yaml
inputs:
  issue:
    required: true
    description: Issue number
  branch:
    default: fix/${issue}
```

```bash
converge .converge/playbooks/fix-issue/playbook.yml run --issue=42
# issue=42, branch=fix/42 (default resolved)
```

Variables are substituted in TASK.md files, playbook.yml defaults, and epic IDs.

## Run Modes

| Mode         | Flag         | Behavior                                            |
| ------------ | ------------ | --------------------------------------------------- |
| `autonomous` | (default)    | Snap → find → execute → commit loop                 |
| `converge`   | `--converge` | Wave-based: evaluate goals → plan → execute → score |
| `step`       | `--step`     | Execute one task then exit                          |

The playbook's `run.mode` sets the default. CLI flags override.

## Journal Structure

Every playbook gets its own journal namespace:

```
journal/{playbook}/
├── playbook.json         ← { name, created, lastRun, totalRuns }
├── trends.jsonl          ← one line per run (sessionId, timing, task counts)
├── tasks/                ← task execution records
│   └── {epicId}/
│       └── {taskId}/
│           ├── checkpoint.json
│           └── attempts/
│               └── 01/
│                   ├── TASK.md
│                   ├── LEARN.md
│                   └── logs/
└── sessions/             ← one per run
    └── {sessionId}/
        ├── metadata.json
        ├── events.jsonl
        └── progress.jsonl
```

**trends.jsonl** enables cross-run comparison:

```jsonl
{"sessionId":"sess-001","timestamp":"...","tasksTotal":5,"tasksComplete":5,"tasksFailed":0,"durationMs":60000}
{"sessionId":"sess-002","timestamp":"...","tasksTotal":5,"tasksComplete":5,"tasksFailed":0,"durationMs":45000}
```

## Path Resolution

All paths are resolved through `PlaybookPaths`:

```typescript
import { resolvePlaybookPaths } from "@openplaybooks/converge-core";

const paths = resolvePlaybookPaths(projectDir, "fix-issue");
paths.tasks; // .converge/playbooks/fix-issue/tasks/
paths.goals; // .converge/playbooks/fix-issue/goals/
paths.journal; // .converge/journal/fix-issue/
paths.journalTasks; // .converge/journal/fix-issue/tasks/
paths.sessions; // .converge/journal/fix-issue/sessions/
paths.config; // .converge/playbooks/fix-issue/playbook.yml

const defaults = resolvePlaybookPaths(projectDir);
paths.tasks; // .converge/playbooks/default/tasks/
paths.journal; // .converge/journal/default/
```

## Quick Start

1. Create a playbook directory:

```bash
mkdir -p .converge/playbooks/fix-issue/tasks/001-investigate
mkdir -p .converge/playbooks/fix-issue/tasks/002-fix
```

2. Write `playbook.yml`:

```yaml
name: fix-issue
inputs:
  issue: { required: true }
key: issue
tasks:
  - path: 001-investigate
  - path: 002-fix
run:
  mode: autonomous
  maxDuration: 30m
```

3. Write task templates:

```bash
echo '---
title: Investigate issue ${issue}
---
Read issue ${issue} and identify the root cause.' > .converge/playbooks/fix-issue/tasks/001-investigate/TASK.md

echo '---
title: Fix issue ${issue}
---
Implement the fix.' > .converge/playbooks/fix-issue/tasks/002-fix/TASK.md
```

4. Run it:

```bash
converge .converge/playbooks/fix-issue/playbook.yml run --issue=42
converge .converge/playbooks/fix-issue/playbook.yml run --issue=43
converge playbook history fix-issue
```
