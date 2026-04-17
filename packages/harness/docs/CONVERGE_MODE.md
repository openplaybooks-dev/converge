# Converge Mode

`harness run --converge`

Compound convergence mode. Each run closes more gaps than the last. Progress is never lost. Gaps compound downward toward zero.

---

## When to Use

Use `--converge` when you want the harness to **keep getting closer to done** across multiple runs, not just execute tasks once and hope for the best.

| Scenario | Use `run` | Use `run --converge` |
|----------|-----------|---------------------|
| Fresh project, first execution | ✅ | |
| Tasks fail and you want progress preserved | | ✅ |
| Static analysis backlogs (tsc, eslint, TODOs) should drive fixes | | ✅ |
| You need to see "are gaps going up or down across runs?" | | ✅ |
| One-shot: run tasks, stop | ✅ | |
| Iterative: run, fix, run again, fewer gaps each time | | ✅ |

**Rule of thumb**: If you'll run the harness more than once on the same project, use `--converge`.

---

## What Makes It Different

Standard `harness run` executes tasks and marks them complete or failed. That's it. If a task stalls after fixing 7 of 10 gaps, all 7 fixes are thrown away. Next run starts from scratch with 10 gaps.

`--converge` adds three mechanisms:

### 1. Weighted Gap Scoring

Not all gaps score the same. A missing feature deliverable is 100x more important than a TypeScript error.

```
Gap Kind                  │ Weight │ Rationale
──────────────────────────┼────────┼──────────────────────────────
Missing output (feature)  │  1000  │ The whole point of the task
Plan/WBS not seeded       │   500  │ Blocks everything downstream
Input blocked (dependency)│   200  │ Can't even start
Custom check failed       │   100  │ Task-specific validation
Corrupted output          │    50  │ Exists but broken
Backlog:high (tsc errors) │    10  │ Code compiles but has errors
Backlog:medium (eslint)   │     5  │ Style/quality
Backlog:low (TODOs)       │     1  │ Nice to fix eventually
```

Severity multiplies the base weight:

| Severity | Multiplier |
|----------|-----------|
| critical | 4x |
| high | 2x |
| medium | 1x |
| low | 0.5x |

**Why this matters**: Fixing 1 missing feature moves the convergence score by 1000 points. Fixing 100 TODO comments moves it by 100 points. The system naturally prioritizes what matters.

The convergence score is the sum of all gap weights. The goal is to drive it to zero.

### 2. Gap Ledger (Cross-Run Trend)

Every converge run appends a snapshot to `.harness/journal/gap-ledger.jsonl`:

```json
{
  "timestamp": "2026-04-10T15:00:00Z",
  "runId": "converge-a1b2c3d4",
  "phase": "end",
  "totalGaps": 23,
  "weightedScore": 4850,
  "byKind": { "output": 3000, "check-failed": 1200, "backlog": 650 },
  "bySeverity": { "critical": 2000, "high": 1800, "medium": 800, "low": 250 },
  "delta": -1200,
  "trend": "improving"
}
```

View the trend with `harness trend`:

```
  Run  │ Gaps │ Score │  Delta │ Trend
  ─────┼──────┼───────┼────────┼──────────
  001  │   42 │ 12400 │        │ first-run ·
  002  │   38 │  9200 │ -3200  │ improving ↘
  003  │   35 │  6100 │ -3100  │ improving ↘
  004  │   36 │  6300 │  +200  │ degrading ↗
  005  │   23 │  2850 │ -3450  │ improving ↘
```

**Trend classification**:
- `improving` — 3+ consecutive negative deltas (score going down)
- `stalled` — delta near zero
- `degrading` — score went up (new gaps appeared faster than old ones closed)

### 3. Partial Progress Preservation

Standard mode: task stalls after 3 retries → marked `failed` → all progress lost.

Converge mode: task stalls → remaining gap IDs saved → marked `partial` → next run starts from where this one stopped.

```
Run 1:  Task has 10 gaps
        → Fixes 7, stalls on 3
        → Status: partial (remainingGapIds: 3)

Run 2:  Task resumes with 3 gaps (not 10)
        → Fixes 2, stalls on 1
        → Status: partial (remainingGapIds: 1)

Run 3:  Task resumes with 1 gap
        → Fixes 1
        → Status: complete ✅
```

The compound effect: progress accumulates across runs.

---

## Backlog → Gap Bridge

When tasks declare `backlogs:` in their frontmatter, converge mode converts every backlog item into a weighted gap that feeds the convergence loop.

```yaml
---
id: implement-screens
title: Implement all screens
backlogs:
  - id: tsc-errors
    cmd: "tsc --noEmit 2>&1 | grep 'error TS' | wc -l"
    description: TypeScript errors
    severity: high
  - id: eslint-errors
    cmd: "eslint src/ --format compact 2>&1 | grep -c 'Error'"
    description: ESLint errors
    severity: medium
  - id: todo-items
    cmd: "grep -rn 'TODO\\|FIXME' src/"
    description: TODO/FIXME items
    severity: low
---
```

Without `--converge`, these go to `backlogs.jsonl` and are never acted on.

With `--converge`, each output line becomes a `Gap` with `gapKind: 'backlog'` and a weight based on severity. The convergence loop picks them up, generates fix tasks, and drives the count down.

---

## Usage

### Basic converge run

```bash
harness run --converge
```

### With options

```bash
# Filter to one epic
harness run --converge --filter 02-implementation

# Verbose (shows score breakdown by kind)
harness run --converge --verbose

# Limit iterations
harness run --converge --max-iterations=20

# Force re-run a specific task (even if partial/completed)
harness run --converge --filter 02-implementation/003-build-ui --force
```

### Resuming after crash or interruption

The converge runner handles any termination — clean (Ctrl+C) or hard (kill -9, OOM, power loss).

```bash
# Process dies mid-task (any reason: Ctrl+C, kill -9, OOM, spot reclaim)
# On disk:
#   - Task checkpoint: status:'running' (written before execution started)
#   - Gap ledger: "start" entry exists, no "end" entry
#   - Completed tasks: untouched (already persisted)

# Resume: recover and continue
harness run --converge --resume

# Or: reset all non-complete tasks and start fresh
harness run --converge --restart
```

What `--resume` does on startup:
1. **Stuck task recovery**: Scans all checkpoints for `running` or `interrupted` status. For each, checks if outputs exist on disk (task may have finished before the crash). Outputs exist → marks complete. Missing → resets to pending.
2. **Ledger recovery**: `closeOrphanedRuns()` finds "start" entries without a matching "end" and closes them with `trend: 'crashed'`. The trend table stays consistent.
3. **Normal converge loop**: Continues with recovered state. Completed tasks stay completed. Partial tasks resume from their saved gap list.

What happens without `--resume` when stuck tasks exist:
```
⛔ Found 1 task(s) in interrupted/running state:

   • 003-build-ui (status: running, idle 12m)

To continue, use one of:
   harness run --converge --resume    # recover interrupted tasks
   harness run --converge --restart   # reset all tasks to pending
```

The runner refuses to start if it detects stuck tasks — this prevents double-execution or state corruption.

### Two processes in parallel

The converge runner tolerates concurrent access without corruption:

- **Task checkpoints**: Per-task files. Different tasks don't conflict. If two processes pick the same task, the second sees `status:'running'` and recovery handles it.
- **Gap ledger**: Append-only JSONL. Concurrent appends are safe (each write is a single line, atomic at the OS level for small writes).
- **Backlog bridge**: Stateless. Running `tsc --noEmit` twice is idempotent.

### View trend

```bash
harness trend
```

---

## Output

A converge run prints a summary at the end:

```
═══════════════════════════════════════════════════════
  CONVERGE SUMMARY
═══════════════════════════════════════════════════════
  Iterations:      12
  Tasks completed: 8
  Tasks partial:   2
  Tasks failed:    1
  Score:           12400 → 2850 (-9550)
  Trend:           improving
  Converged:       NO

  Top remaining gaps:
    [1000] [implement-auth] Task output not created: src/auth/login.tsx
    [200]  [implement-auth] Check failed: vitest run --reporter=json
    [10]   [tsc-errors] src/pages/Home.tsx:42: error TS2345
    [5]    [eslint-errors] src/utils/format.ts: no-unused-vars
    [1]    [todo-items] src/api/client.ts:12: TODO: add retry logic

  Run  │ Gaps │ Score │  Delta │ Trend
  ─────┼──────┼───────┼────────┼──────────
  001  │   42 │ 12400 │        │ first-run ·
  002  │   23 │  2850 │ -9550  │ improving ↘
```

---

## Strengths

**1. Prioritizes what matters.**
Not all gaps are equal. Weight-based scoring means the system works on missing features before lint errors. A senior engineer reviewing the gap list sees the same priorities they'd set manually.

**2. Never loses progress.**
Partial task status preserves fixed gaps across runs. If your CI runner times out after fixing 7 of 10 issues, the next run picks up from 3, not 10. Over multiple short runs, even large tasks converge.

**3. Makes invisible trends visible.**
Without the gap ledger, you can't answer "are we getting closer to done?" You can only look at the current state. The trend table shows the trajectory — improving, stalled, or degrading — across all runs.

**4. Turns static analysis into action.**
Backlog definitions sit idle in standard mode. Converge mode bridges them into the gap system. Every `tsc` error, every `eslint` violation is a weighted gap that the convergence loop works to close. Backlogs shrink automatically.

**5. Crash-safe. Not just signal-safe.**
The process can die at any point — kill -9, OOM, power loss, cloud spot instance reclaim. No signal handler will fire. Safety comes from the same model as the core harness:

- **Task state**: checkpoint writes `status:'running'` to disk BEFORE execution. If the process crashes, the task is left in `running` on disk. On next `--resume` run, `detectStuckTasks()` finds it, checks if outputs exist → marks complete if they do, resets to pending if they don't.
- **Gap ledger**: `closeOrphanedRuns()` runs at startup and detects "start" entries without a matching "end". It closes them with a `trend: 'crashed'` marker so the trend table stays consistent.
- **Backlog bridge**: `collectAllGaps()` is idempotent — re-running `tsc`/`eslint`/`grep` produces the same output. Nothing to persist or recover.
- **In-memory counters** (iteration, tasksCompleted): just for display. Real state lives in checkpoint files on disk.

Signal handlers (SIGINT/SIGTERM) are polish for cleaner UX. They are **not** the safety mechanism.

**6. Compounds.**
Each mechanism reinforces the others. The ledger shows the compound effect. Partial progress means each run starts closer to done. Weighted scoring means high-impact work happens first. The result: fewer gaps, every run, until zero.

---

## Architecture

```
harness run --converge [--resume|--restart]
│
│  ── CRASH RECOVERY (runs every startup) ──────────
│
├── detectStuckTasks()        ← scan checkpoints for running/interrupted
│   ├── --resume              ← outputs exist? complete : pending
│   └── --restart             ← reset all to pending
│
├── closeOrphanedRuns()       ← close "start" entries with no "end"
│                                (process crashed between start/end writes)
│
│  ── GAP SNAPSHOT ─────────────────────────────────
│
├── collectAllGaps()          ← idempotent: findGaps() + backlog bridge
│   ├── findGaps(unit)        ← outputs, checks, inputs, plan, wbs
│   └── collectBacklogGaps()  ← tsc, eslint, grep TODO → weighted Gap[]
│
├── appendLedgerEntry(start)  ← snapshot before run
│
│  ── CONVERGENCE LOOP ─────────────────────────────
│  (process can crash anywhere in this loop — next --resume recovers)
│
├── loop:
│   ├── tree.findNextTask()   ← partial tasks are runnable (not locked)
│   ├── startAttempt()        ← checkpoint: status:'running' (ON DISK)
│   ├── executeTask()         ← AI execution
│   ├── completeAttempt()     ← checkpoint: status:'complete' (ON DISK)
│   └── on stall:
│       ├── markTaskPartial() ← checkpoint: remaining gap IDs (ON DISK)
│       └── (next run resumes from here)
│
├── appendLedgerEntry(end)    ← snapshot after run
│
└── print summary + trend table
```

### Files

| File | Purpose |
|------|---------|
| `src/converge/weights.ts` | Weight map, scoring functions, sort by weight |
| `src/converge/gap-ledger.ts` | JSONL append, read, orphan recovery, trend classification, CLI table |
| `src/converge/backlog-bridge.ts` | `BacklogItem[]` → `Gap[]` converter |
| `src/converge/converge-runner.ts` | Orchestrator: ledger + execute + partial + signal handling |
| `src/converge/index.ts` | Barrel exports |

### Modified files

| File | Change |
|------|--------|
| `checkpoint/unit-checkpoint.ts` | Added `partial` status + `remainingGapIds` + `markPartial()` |
| `checkpoint/manager.ts` | Added `markTaskPartial()` |
| `checkpoint/filesystem-status.ts` | Added `partial` to status union |
| `tree/journal-tree.ts` | Added `partial` to status union |
| `cli/commands-run.ts` | Added `--converge` dispatch with `resume`/`restart` passthrough |
| `cli/main.ts` | Added `--converge` flag, `harness trend` command |
| `cli/autonomous-run.ts` | Exported `detectStuckTasks`, `recoverStuckTasks`, `resetAllTasks` for reuse |
