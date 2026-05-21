---
rfc: 0033
title: Inventory is authoritative for state; journal is execution mirror
status: draft
type: refactor
source: human
priority_tier: tier1
estimate: "4-5 days"
backwards_compatible: yes
risk: low
breaks_existing: no
---
# RFC 0033: Inventory is authoritative; journal is execution mirror

## Problem

The 3-layer architecture (RFC 0031 + RFC 0032) defines:

| Layer | Location | Purpose | Commit? |
|---|---|---|---|
| **Authoring** | `tasks/*/TASK.md` | Task definitions | Yes |
| **Inventory** | `.converge/inventory/<pb>/tasks.jsonl` + `goals.jsonl` | Runtime state (status, fingerprint, completion) | Yes |
| **Journal** | `.converge/journal/<pb>/` | Execution artifacts (logs, checkpoints, events, sessions) | No |

**But both reads AND writes treat journal as the primary store:**

1. **`markTaskCompleted` / `markTaskFailed` / `markTaskSeeded`** in `TaskStateManager` write to `checkpoint.json` under `.converge/journal/`. Inventory is updated as a side-effect at best.
2. **`converge list`** reads from `target/manifest.json` (compiled artifact), not inventory.
3. **`converge metrics`** reads exclusively from journal log files. Without journal, returns zero data.
4. **`converge status`** reads completed/failed/locked from journal `checkpoint.json` files.
5. **`converge inspect`** reads from journal structure.

**Consequence:** On a freshly-cloned repo (journal is `.gitignore`'d), there's no authoritative state to read. Inventory has task status but write commands bypass it.

### Partial support exists

`getTaskStates()` in `packages/cli/src/next-task.ts` already reads inventory as "Source 0" (lines 417-440). `appendTaskUpsert()` already writes to inventory. The inventory layer works — it's just not the primary target for state mutations or read commands.

## Principle

**Inventory is the authoritative store for all task state. Journal is a mirror of execution context.**

| Operation | Primary target | Secondary (if exists) |
|---|---|---|
| Read task status | `.converge/inventory/<pb>/tasks.jsonl` | journal checkpoints (fallback) |
| Read metrics | `tasks.jsonl` rows | journal log files (enrichment) |
| Mark task done/failed | `tasks.jsonl` via `appendTaskUpsert()` | journal `checkpoint.json` (mirror) |
| Mark task seeded | `tasks.jsonl` via `appendTaskUpsert()` | journal `checkpoint.json` (mirror) |
| Track execution attempt | journal `checkpoint.json` + `tasks.jsonl` attempt count | — |
| Session forensics | — | journal logs, events.jsonl |

Read-only commands (list, status, metrics, inspect overview, gantt, graph) must function fully from inventory + authoring alone. Journal enriches but never blocks them.

## Proposal

### A. Enrich inventory task rows with execution metrics

**File:** `packages/core/src/task/goal/runtime-ledger.ts` — `RuntimeTask` interface

Add fields to capture everything currently only available from journal logs:

```typescript
export interface RuntimeTask {
  // ... existing fields (id, taskPath, taskRef, params, parent, depends_on,
  // title, goalId, summary, status, source, playbook, outputs, checks,
  // fingerprint, completedAt, createdAt, updatedAt, metadata) ...

  // Execution metrics (written on each status transition)
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  costUsd?: number;
  model?: string;
  numTurns?: number;
  totalToolCalls?: number;
  attemptCount?: number;
}
```

### B. State mutations write to inventory first

**Files affected:**
- `packages/core/src/checkpoint/state.ts` — `TaskStateManager.markTaskCompleted()`, `markTaskFailed()`, `markTaskSeeded()`
- `packages/core/src/task/goal/runtime-ledger.ts` — `appendTaskUpsert()` (already writes to inventory; needs to accept metrics fields)

Current pattern (journal-primary):
```
markTaskCompleted(taskId) → write journal/checkpoint.json → (maybe) mirror to inventory
```

New pattern (inventory-primary):
```
markTaskCompleted(taskId, metrics) → appendTaskUpsert(task, { status: "done", ...metrics })
                                    → write journal/checkpoint.json (mirror, best-effort)
```

The inventory write is the authoritative operation. Journal checkpoint writes become best-effort mirrors — they exist for the runner's internal retry logic and session forensics, but are never the source of truth for "is this task done?"

### C. Add `getInventoryDir` utility

**File:** `packages/core/src/journal/structure.ts`

```typescript
export function getInventoryDir(projectDir: string, playbookName?: string): string {
  const name = playbookName ?? process.env.CONVERGE_PLAYBOOK ?? "default";
  return join(projectDir, ".converge", "inventory", name);
}
```

### D. Update `converge list` — inventory-first

**File:** `packages/cli/src/commands-list.ts`

- Read task runtime status from `readTaskInventoryState()` (inventory)
- Merge with DAG structure from `buildDagFromPlaybook()` (authoring)
- Display: `task-id    [status]`
- Keep `--state` and `--select` flags working

### E. Update `converge metrics` — inventory primary, journal enrichment

**File:** `packages/cli/src/commands-metrics.ts`

```
1. Read readTaskInventoryState() → derive completion counts, success rates,
   durations, costs, tokens from inventory rows
2. If journal exists, extractAll(journalRoot) → enrich with session-level detail
   (tool call breakdown, event timelines)
3. If journal missing, warn: "Journal not found. Session-level detail unavailable."
4. Merge and display
```

New helper: `extractFromInventory(projectDir, playbookName)` in `packages/core/src/metrics/extract.ts`

### F. Update `converge status` — inventory-first

**File:** `packages/cli/src/commands.ts` (`printFullStatus`)

- Read completed/dropped/blocked from inventory `tasks.jsonl` (primary)
- Fall back to `TaskStateManager` checkpoint scan for tasks not in inventory
- Merge with inventory taking precedence

### G. Ensure `.gitignore` separates layers

Confirm `.converge/journal/` and `.converge/target/` are ignored. `.converge/inventory/` must NOT be ignored.

## Implementation Order

1. **Add metrics fields to `RuntimeTask`** — `packages/core/src/task/goal/runtime-ledger.ts`
2. **Flip state mutations to inventory-first** — `packages/core/src/checkpoint/state.ts` → `appendTaskUpsert()` is primary, journal checkpoint is mirror
3. **Add `getInventoryDir` utility** — `packages/core/src/journal/structure.ts`
4. **Update `converge list`** — `packages/cli/src/commands-list.ts`
5. **Update `converge metrics`** — `packages/cli/src/commands-metrics.ts` + `extractFromInventory()`
6. **Update `converge status`** — `packages/cli/src/commands.ts`
7. **Tests** — verify all read-only commands work inventory-only; verify state mutations update inventory

## Verification

1. Clone a repo with `.converge/inventory/` but no `.converge/journal/`.
2. `converge list` shows task IDs with status.
3. `converge metrics` shows completion counts, success rates, per-task duration/cost/tokens with a warning that session-level detail is unavailable.
4. `converge status` shows completed/failed/locked counts from inventory.
5. `converge gantt` and `converge graph` continue to work.
6. `converge run` still writes journal for execution context; inventory is the primary state store.
7. Existing tests pass — no regression.

## Relationship to prior RFCs

| RFC | Relationship |
|---|---|
| **0031** | Extends the unified `tasks.jsonl` row schema with execution metrics. Reinforces "one file, one row" as the authoritative state store. |
| **0032** | Complements "tasks/ is source of truth for definitions" with "inventory is source of truth for state." |
