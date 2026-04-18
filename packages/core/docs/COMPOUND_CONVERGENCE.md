# Compound Convergence: Fewer Gaps Over Time

## The Problem

Tasks leave leftover gaps. Backlogs accumulate unexpectedly. The system should get **closer to done** with every run, but instead gaps pile up and become hard to manage.

Three root causes:

### 1. Tasks fail-and-reset instead of accumulate progress

In `unit/run.ts`, when a task stalls after 3 iterations:

- Task is marked **failed**
- All partial progress inside that attempt is abandoned
- Next run starts from scratch — same gaps, same stall

**What should happen**: Partial progress is preserved. If a task fixed 3 of 5 gaps before stalling, those 3 should stay fixed. The next run starts with 2 gaps, not 5.

### 2. Backlogs are collected but never become gaps

`scan/backlog-runner.ts` runs shell commands and parses output into `BacklogItem[]`. But these items are stored in `backlogs.jsonl` and displayed by `converge backlog` — they **never enter the gap system**. The convergence loop doesn't know about them.

**What should happen**: Backlog items become gaps. Every `BacklogItem` with severity "high" is a gap that needs a task to fix it. The convergence loop picks them up automatically.

### 3. No cross-run gap trend

`ConvergenceState` tracks gaps within a single run. But there's no metric that answers: "across all runs this week, are project-wide gaps going up or down?"

**What should happen**: A gap ledger that records total gap count at the start and end of every run. Visualize the trend. Alert when gaps are increasing.

---

## Solution: 3 Mechanisms

### Mechanism 1: Gap Ledger (cross-run trend tracking)

A simple append-only JSONL file that records a snapshot after every run:

```
.converge/journal/gap-ledger.jsonl
```

Each line:

```json
{
  "timestamp": "2026-04-10T15:00:00Z",
  "runId": "run-042",
  "phase": "end",
  "totalGaps": 23,
  "byCategory": { "tsc": 12, "eslint": 8, "test-fail": 3 },
  "bySeverity": { "critical": 2, "high": 8, "medium": 10, "low": 3 },
  "delta": -4,
  "trend": "improving"
}
```

**Key fields:**

- `delta`: Change from previous run. Negative = gaps closed. Positive = gaps added.
- `trend`: "improving" (3+ consecutive negative deltas), "stalled" (delta ~0), "degrading" (positive deltas)

**CLI command:**

```bash
converge trend

  Run  │ Gaps │ Delta │ Trend
  ─────┼──────┼───────┼──────────
  038  │  42  │       │
  039  │  38  │   -4  │ improving ↘
  040  │  35  │   -3  │ improving ↘
  041  │  36  │   +1  │ mixed     →
  042  │  23  │  -13  │ improving ↘↘
```

**Implementation**: ~50 lines. Append to JSONL after each `autonomousRun()` completes. Read and display in CLI.

### Mechanism 2: Backlog → Gap Bridge

Convert `BacklogItem[]` into `Gap[]` so the convergence loop processes them.

Currently:

```
BacklogDef (cmd: "tsc --noEmit")
    → backlog-runner.ts → BacklogItem[]
        → backlogs.jsonl (dead end)
```

Should be:

```
BacklogDef (cmd: "tsc --noEmit")
    → backlog-runner.ts → BacklogItem[]
        → backlog-to-gap converter → Gap[]
            → convergence loop → task generation → fix
```

**The converter** (new function, ~30 lines):

```typescript
function backlogItemToGap(item: BacklogItem, taskId: string): Gap {
  return {
    id: `backlog-${item.backlogId}-${item.file ?? "unknown"}-${item.line ?? 0}`,
    type: "quality",
    level: "task",
    scope: taskId,
    description: `[${item.backlogId}] ${item.raw}`,
    detected: item.collectedAt,
    resolved: false,
    checks: [item.backlogId],
    severity:
      item.severity === "high"
        ? "high"
        : item.severity === "medium"
          ? "medium"
          : "low",
    metadata: {
      gapKind: "backlog",
      file: item.file,
      line: item.line,
      backlogId: item.backlogId,
    },
  };
}
```

**Integration point**: In `unit/find-gaps.ts`, after checking outputs and running checks, also run backlogs and convert to gaps:

```typescript
// In findGaps():
if (unit.backlogs && unit.backlogs.length > 0) {
  const items = runBacklogs(unit.backlogs, projectDir);
  const backlogGaps = items.map((item) => backlogItemToGap(item, unit.id));
  gaps.push(...backlogGaps);
}
```

Now every `tsc` error, every `eslint` violation, every `grep TODO` result is a gap that drives the convergence loop.

### Mechanism 3: Partial Progress Preservation

When a task stalls, don't throw away progress. Instead:

**Current behavior** (`unit/run.ts:400-405`):

```
stall 3x → return false → task marked failed → all progress lost
```

**New behavior:**

```
stall 3x → snapshot remaining gaps → mark task "partial"
           → next run starts with ONLY the remaining gaps (not all original gaps)
```

**Implementation:**

#### a) New task status: `partial`

Add to checkpoint alongside `complete`, `failed`, `seeded`:

```typescript
type TaskStatus =
  | "pending"
  | "active"
  | "complete"
  | "failed"
  | "seeded"
  | "partial";
```

A `partial` task:

- Has some outputs present (don't regenerate them)
- Has remaining gaps recorded (only fix those)
- Gets priority in next run (it's closest to done)

#### b) Record remaining gaps on stall

When `run()` returns false due to stall, write remaining gaps to checkpoint:

```typescript
// In unit/run.ts, before returning false:
const remainingGaps = await findGaps(unit);
await writeRemainingGaps(unit, remainingGaps);
// Mark as partial, not failed
await checkpoint.markTaskPartial(taskId, remainingGaps);
```

#### c) Resume from partial state

When `run()` starts, if task is `partial`:

```typescript
const saved = await loadRemainingGaps(unit);
if (saved.length > 0) {
  // Start from iteration 2 — skip initial execution, go straight to fix
  previousGaps = saved;
  iteration = 1; // Will enter the "Iteration 2+" branch
}
```

This means: if a task had 10 gaps, fixed 7, stalled on 3 — next run starts with 3 gaps, not 10.

---

## The Compound Effect

With all three mechanisms:

```
Run 1:  100 gaps detected (fresh project)
        → 60 resolved, 40 remaining
        → Ledger: 100 → 40 (delta: -60)

Run 2:  40 remaining + 5 new (code changed)
        → 30 resolved, 15 remaining
        → Ledger: 40 → 15 (delta: -25)

Run 3:  15 remaining + 2 new
        → 14 resolved, 3 remaining
        → Ledger: 15 → 3 (delta: -12)

Run 4:  3 remaining + 0 new
        → 3 resolved
        → Ledger: 3 → 0 (delta: -3) ✅ CONVERGED
```

Each run builds on the previous. Gaps compound downward. Progress is never lost.

---

## Backlog Definitions in TASK.md

The backlog system already supports declaring checks in task frontmatter:

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
    severity: high
  - id: todo-items
    cmd: "grep -rn 'TODO\\|FIXME\\|HACK' src/"
    description: TODO/FIXME items
    severity: low
  - id: unused-imports
    cmd: "eslint src/ --rule '{no-unused-vars: error}' --format compact 2>&1 | grep 'no-unused-vars'"
    description: Unused imports
    severity: medium
---
```

Each backlog `cmd` is a static analysis command. Output lines become gaps. Gaps drive tasks. Tasks fix code. Backlogs shrink. **Compound convergence.**

---

## What Changes in the Codebase

| File                     | Change                                                    | Effort |
| ------------------------ | --------------------------------------------------------- | ------ |
| `unit/find-gaps.ts`      | Add backlog → gap conversion after existing gap detection | Small  |
| `scan/backlog-runner.ts` | Add `backlogItemToGap()` converter function               | Small  |
| `checkpoint/manager.ts`  | Add `partial` status + `markTaskPartial()` method         | Small  |
| `unit/run.ts`            | On stall: write remaining gaps, mark partial (not failed) | Small  |
| `unit/run.ts`            | On start: resume from partial state with saved gaps       | Small  |
| `journal/gap-ledger.ts`  | **New file**: append snapshot to `gap-ledger.jsonl`       | Small  |
| `cli/commands-trend.ts`  | **New file**: `converge trend` command                    | Small  |
| `cli/autonomous-run.ts`  | After run: write gap ledger entry                         | Small  |

**Total effort: ~200 lines of new code across 8 files.**

---

## Priority Order

1. **Gap Ledger** (visibility first — you can't fix what you can't measure)
2. **Backlog → Gap bridge** (biggest impact — all static analysis enters the loop)
3. **Partial task status** (preserves progress — compound effect kicks in)

---

## The Pitch

> **Converge doesn't just run tasks. It compounds.**
>
> Every run closes more gaps than the last. Progress is never lost.
> Static analysis drives the loop. Backlogs shrink automatically.
> Track the trend: fewer gaps, every run, until zero.
