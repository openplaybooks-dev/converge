# Proposal: Workflow Journal

**Status**: Draft
**Date**: 2026-04-12

---

## One Sentence

Add a `journal/workflows/` layer that tracks reusable workflows across executions — with facts, artifacts, gaps, and trends — so any workflow can be run thousands of times and improve over time.

---

## Problem

Today the journal is organized around sessions and epics:

```
journal/
├── sessions/{sessionId}/      ← one run
│   ├── metadata.json
│   ├── events.jsonl
│   └── progress.jsonl
└── epics/{epicId}/            ← task execution
    └── tasks/{taskId}/
        └── attempts/{n}/
```

This captures **one run**. But there's no structure for:

- Running the same pipeline repeatedly with different inputs
- Comparing execution #5 to execution #50
- Tracking what improved and what regressed
- Collecting facts and artifacts across executions
- Knowing which workflow produced which session

Sessions are anonymous. Epics are structural. Nothing ties them together as "the same workflow, run again."

---

## Solution

Add `journal/workflows/{slug}/` — a general-purpose layer that wraps sessions and epics, adding identity, history, and cross-run data.

```
journal/workflows/{workflow-slug}/
│
├── workflow.json                      # Workflow definition snapshot
│
├── executions/
│   └── {execution-id}/
│       ├── metadata.json              # Input, outcome, timing
│       ├── facts.jsonl                # Facts collected during this execution
│       ├── artifacts/                 # Artifacts produced by this execution
│       │   └── {key}/{timestamp}/
│       │       ├── manifest.json
│       │       └── {file}
│       ├── gaps.jsonl                 # Gaps detected during this execution
│       ├── checks.json                # Check results at end of execution
│       │
│       ├── session/                   # Session data (existing format)
│       │   ├── events.jsonl
│       │   ├── progress.jsonl
│       │   └── session.log
│       │
│       └── epics/                     # Epic journals (existing format)
│           └── {epicId}/
│               └── tasks/{taskId}/
│                   ├── checkpoint.json
│                   └── attempts/{n}/
│                       ├── data/
│                       ├── logs/
│                       ├── TASK.md
│                       ├── CHECK.md
│                       └── LEARN.md
│
├── facts.jsonl                        # Facts across ALL executions (append-only)
├── gaps.jsonl                         # Gaps across ALL executions (append-only)
└── trends.jsonl                       # One line per execution, metrics over time
```

---

## Key Concepts

### Workflow

A named, reusable pipeline. Definition lives in `.converge/workflows/{slug}.md`.

```yaml
# .converge/workflows/react-app.md
---
name: react-app
description: Build a React app from an idea
input: idea.md
pipeline:
  - epic: 01-prepare-requirements
  - epic: 02-foundation
  - epic: 03-build-screens
  - epic: 05-add-behavior
  - epic: 06-remediation

checks:
  - id: builds-clean
    cmd: "tsc --noEmit && npm run build"
  - id: stores-connected
    cmd: "node .converge/goals/002-stores-connected/check.js"
---
```

A workflow could be anything: building an app, processing data, running a migration, generating docs. The journal structure doesn't assume what the workflow does.

### Execution

One run of a workflow with a specific input. Gets its own directory under `executions/`.

### Facts (per-execution + cross-execution)

Same `Fact` type the framework already uses. Collected during execution, written to both:
- `executions/{id}/facts.jsonl` — facts from this run
- `workflows/{slug}/facts.jsonl` — all facts across all runs (append-only, tagged with executionId)

This lets you query: "across 100 runs, how often did `check:tsc-clean` pass?"

### Artifacts (per-execution)

Same `ArtifactAPI` the framework already uses. Each execution gets its own artifact store at `executions/{id}/artifacts/`. Same timestamped folder layout as `.converge/artifacts/`.

### Gaps (per-execution + cross-execution)

Gaps detected during the run. Written to:
- `executions/{id}/gaps.jsonl` — gaps from this run
- `workflows/{slug}/gaps.jsonl` — all gaps across all runs (tagged with executionId)

Cross-execution gap data answers: "which gaps keep recurring?" and "which gaps are we no longer hitting?"

### Trends

One line per execution in `trends.jsonl`. Aggregated metrics — not specific to any use case, just numbers the framework can compute from any run:

```jsonl
{"executionId":"exec-001","timestamp":"...","input":"todo-app.md","tasksTotal":24,"tasksComplete":22,"tasksFailed":2,"totalAttempts":31,"avgAttempts":1.29,"gapsDetected":8,"gapsResolved":5,"checksTotal":6,"checksPassed":4,"durationMs":1053000}
```

---

## File Formats

### execution metadata.json

```json
{
  "executionId": "exec-2026-04-12T02-30-00-a1b2c3",
  "workflowSlug": "react-app",
  "input": {
    "file": "inputs/expense-tracker.md",
    "hash": "sha256:abc123..."
  },
  "startTime": "2026-04-12T02:30:00Z",
  "endTime": "2026-04-12T02:47:33Z",
  "durationMs": 1053000,
  "status": "complete",
  "outcome": {
    "tasksTotal": 24,
    "tasksCompleted": 22,
    "tasksFailed": 2,
    "totalAttempts": 31,
    "avgAttemptsPerTask": 1.29,
    "stallCount": 1,
    "convergenceAchieved": false
  },
  "sessionId": "2026-04-12T02-30-00-a1b2c3",
  "vars": {}
}
```

### execution facts.jsonl

Same `Fact` type from `src/facts/api.ts`, with `executionId` added:

```jsonl
{"executionId":"exec-001","id":"check:tsc-clean","type":"check","cmd":"tsc --noEmit","ok":true,"output":"","exitCode":0,"collectedAt":"2026-04-12T02:45:00Z"}
{"executionId":"exec-001","id":"check:stores-connected","type":"check","cmd":"node .converge/goals/002-stores-connected/check.js","ok":false,"output":"3 stores unused","exitCode":1,"collectedAt":"2026-04-12T02:45:01Z"}
{"executionId":"exec-001","id":"validation:screen-count","type":"validation","cmd":"jq '.screens | length' .stitch/screens.json","ok":true,"output":"5","exitCode":0,"collectedAt":"2026-04-12T02:35:12Z"}
```

### execution gaps.jsonl

```jsonl
{"executionId":"exec-001","id":"gap-001","type":"check-failed","taskId":"03-build-screens/004-chart","description":"Category chart generation stalled","severity":"high","detected":"2026-04-12T02:40:00Z","resolved":null}
{"executionId":"exec-001","id":"gap-002","type":"output","taskId":"05-add-behavior/003-mock-data","description":"Missing category enum in mock data","severity":"medium","detected":"2026-04-12T02:42:00Z","resolved":"2026-04-12T02:43:30Z"}
```

### execution checks.json

Post-execution check results. Uses the workflow's `checks:` definition.

```json
{
  "executionId": "exec-001",
  "timestamp": "2026-04-12T02:47:40Z",
  "checks": [
    {"id": "builds-clean", "passed": true, "output": "tsc: 0 errors"},
    {"id": "stores-connected", "passed": false, "output": "3 stores unused"}
  ]
}
```

### workflow-level facts.jsonl

Same facts, accumulated across all executions. The `executionId` field links each fact back to its run.

```jsonl
{"executionId":"exec-001","id":"check:tsc-clean","ok":true,"collectedAt":"2026-04-12T02:45:00Z",...}
{"executionId":"exec-001","id":"check:stores-connected","ok":false,"collectedAt":"2026-04-12T02:45:01Z",...}
{"executionId":"exec-002","id":"check:tsc-clean","ok":true,"collectedAt":"2026-04-12T03:15:00Z",...}
{"executionId":"exec-002","id":"check:stores-connected","ok":true,"collectedAt":"2026-04-12T03:15:01Z",...}
```

Query: "how often does stores-connected pass?" → filter by `id`, count `ok:true` vs `ok:false`.

### workflow-level trends.jsonl

```jsonl
{"executionId":"exec-001","input":"todo-app.md","timestamp":"2026-04-12T02:47:33Z","tasksTotal":24,"tasksComplete":22,"tasksFailed":2,"totalAttempts":31,"avgAttempts":1.29,"gapsDetected":8,"gapsResolved":5,"checksTotal":6,"checksPassed":4,"durationMs":1053000}
{"executionId":"exec-002","input":"todo-app.md","timestamp":"2026-04-12T03:15:00Z","tasksTotal":24,"tasksComplete":24,"tasksFailed":0,"totalAttempts":26,"avgAttempts":1.08,"gapsDetected":3,"gapsResolved":3,"checksTotal":6,"checksPassed":6,"durationMs":750000}
```

---

## How Layers Connect

```
                    WORKFLOW LAYER (new)
                    ━━━━━━━━━━━━━━━━━━━
                    workflows/react-app/
                    ├── facts.jsonl            ← facts across all executions
                    ├── gaps.jsonl             ← gaps across all executions
                    ├── trends.jsonl           ← one line per execution
                    └── executions/
                        └── exec-001/
                            ├── metadata.json  ← input, outcome, timing
                            ├── facts.jsonl    ← this execution's facts
                            ├── artifacts/     ← this execution's artifacts
                            ├── gaps.jsonl     ← this execution's gaps
                            ├── checks.json    ← post-run check results
                            │
               ┌────────────┤
               │            │
               ▼            ▼
    SESSION LAYER        EPIC LAYER
    (exists today)       (exists today)
    ━━━━━━━━━━━━━        ━━━━━━━━━━━━
    session/             epics/
    ├── events.jsonl     └── 03-build-screens/
    ├── progress.jsonl       └── tasks/001-skill-tree/
    └── session.log              └── attempts/01/
                                     ├── data/facts.json
                                     ├── TASK.md
                                     ├── CHECK.result.md
                                     └── LEARN.md
```

The workflow layer sits ON TOP of the existing session and epic layers. It doesn't replace them — it wraps them and adds cross-run data.

---

## Usage

### Running a workflow

```bash
# Run once with an input
converge run --workflow react-app --input inputs/todo-app.md

# Run with multiple inputs (one execution each)
converge run --workflow react-app --inputs inputs/

# Re-run the same input (new execution, same workflow)
converge run --workflow react-app --input inputs/todo-app.md
```

### Querying workflow history

```bash
# Show trend across executions
converge trend --workflow react-app

# Show facts for a specific check across all executions
converge facts --workflow react-app --filter "id:check:tsc-clean"

# Show recurring gaps
converge gaps --workflow react-app --recurring

# List all executions
converge executions --workflow react-app
```

### Workflow without a definition file

Any `converge run` can optionally tag itself as a workflow execution:

```bash
converge run --workflow my-pipeline
```

This creates `journal/workflows/my-pipeline/` and records the execution there, even without a `.converge/workflows/my-pipeline.md` file. The definition file adds checks and pipeline structure but isn't required.

---

## Self-Development as a Use Case

The self-development loop is one way to use workflow journals. Not the only way.

```yaml
# .converge/workflows/self-dev.md
---
name: self-dev
description: Run the react-app workflow, evaluate results, improve framework
input: idea.md
pipeline:
  - workflow: react-app     # runs the inner workflow
  - epic: evaluate          # runs post-workflow checks
  - epic: diagnose          # traces failures to framework files
  - epic: fix               # applies fixes
  - workflow: react-app     # re-runs to verify
---
```

The workflow journal makes this possible because it provides:
- **Facts** — "which checks pass/fail across runs?" drives diagnosis
- **Gaps** — "which gaps recur?" identifies systemic framework issues
- **Trends** — "are things getting better?" validates fixes work
- **Artifacts** — each execution's output is preserved for comparison

But the same journal structure works for any repeated workflow — data pipelines, content generation, test suites, deployments.

---

## Integration with Existing APIs

### FactsLogger

The existing `FactsLogger` writes to `journal/epics/{epic}/tasks/{task}/logs/facts.jsonl`. The workflow layer adds a second write target: `journal/workflows/{slug}/executions/{id}/facts.jsonl` (and appends to workflow-level `facts.jsonl`).

No change to the `Fact` type. Just an additional `executionId` field when writing to the workflow layer.

### ArtifactStore

The existing `ArtifactStore` writes to `.converge/artifacts/{key}/{timestamp}/`. Per-execution artifacts use the same `ArtifactAPI` but scoped to `journal/workflows/{slug}/executions/{id}/artifacts/`.

The execution gets its own `ArtifactStore` instance pointed at its artifacts directory. Same API, different root.

### Gap System

The existing gap detector writes to `journal/epics/`. The workflow layer subscribes to gap events and mirrors them to `executions/{id}/gaps.jsonl` and the workflow-level `gaps.jsonl`.

### Session Logger

The existing `SessionLogger` creates `journal/sessions/{sessionId}/`. When running under a workflow, the session data also lands in `executions/{id}/session/` (symlink or copy).

---

## Implementation

### What exists (no changes)
- Facts API (`src/facts/api.ts`)
- Artifact store (`src/artifacts/index.ts`)
- Gap detection (`src/gap/detector.ts`)
- Session logger (`src/journal/session-logger.ts`)
- Journal structure (`src/journal/structure.ts`)

### What's new

**1. Workflow definition loader** — Reads `.converge/workflows/{slug}.md` (YAML frontmatter + markdown body). Same pattern as `PROJECT.md` and `TASK.md`.

**2. Execution manager** — Creates `journal/workflows/{slug}/executions/{id}/`, initializes per-execution facts/artifacts/gaps writers, links to session.

**3. Workflow-level aggregator** — After each execution, appends to workflow-level `facts.jsonl`, `gaps.jsonl`, and `trends.jsonl`.

**4. CLI integration** — `converge run --workflow {slug}` routes through the execution manager. `converge trend`, `converge facts`, `converge gaps` query workflow-level files.

---

## Summary

The workflow journal is a general-purpose layer that gives any reusable pipeline:

| Capability | How |
|---|---|
| **Identity** | `workflows/{slug}/` — named, not anonymous |
| **History** | `executions/{id}/` — each run preserved |
| **Facts** | Same `Fact` type, per-execution + cross-execution |
| **Artifacts** | Same `ArtifactAPI`, scoped per-execution |
| **Gaps** | Same `Gap` type, per-execution + cross-execution |
| **Trends** | `trends.jsonl` — one line per execution |
| **Comparison** | Query facts/gaps across executions to find patterns |

It wraps the existing session and epic layers without replacing them. Any workflow — app generation, data processing, self-development, testing — gets the same structure.
