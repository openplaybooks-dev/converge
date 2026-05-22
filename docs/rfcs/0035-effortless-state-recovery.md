---
title: Effortless State Recovery
id: 0035
status: proposed
created: 2026-05-22
---

# RFC 0035: Effortless State Recovery

## Problem

State recovery after crashes, manual intervention, or stale runs requires deep framework knowledge:

1. **Seed children invisible to inventory** — spawned subtasks (e.g., `01-design-system/04-component-primitives`) exist only in journal checkpoints, not in `tasks.jsonl`. When `reconcile --fix` rebuilds runstate from inventory, seed children vanish.

2. **Three sources of truth conflict** — inventory (write), runstate (read log), checkpoints (best-effort cache). When they diverge, operators must manually reconcile via `tasks mark`, `clean --select`, or hand-editing (which breaks determinism).

3. **Checkpoint staleness undetected** — a task marked `done` in checkpoint but with missing outputs on disk stays `done` until manual audit.

## Proposed Solution

### 1. `converge reconcile` is the single recovery command

One command, one flag for behavior:

```bash
converge reconcile --playbook=X             # audit only (report discrepancies)
converge reconcile --playbook=X --scan      # audit + scan journal for orphaned seed children
converge reconcile --playbook=X --fix       # apply corrections (inventory + runstate)
converge reconcile --playbook=X --scan --fix # full recovery: audit + scan + apply
```

**Phases (all inside reconcile):**
1. **Audit inventory vs disk** — for each `done` entry, verify declared outputs exist. Report downgrades.
2. **Scan journal for orphaned seed children** (--scan) — find checkpoint.json entries not in inventory, add them with status inferred from checkpoint + output validation.
3. **Rebuild runstate from inventory** (--fix) — same as current reconcile fix.
4. **Report** — show what was fixed, what's still broken, next runnable task.

### 2. Checkpoint validation on read (in `getTaskStates()`)

When loading checkpoint data:
- If `completedTasks` contains `<id>` but outputs don't exist → skip, treat as `pending`
- If `failedTasks` contains `<id>` but checkpoint shows `pass` → skip, trust checkpoint
- Log discrepancies to `.converge/journal/<playbook>/recovery.log`

### 3. Runstate becomes append-only event log (future)

Instead of overwriting `runstate.json` on every reconcile:
- Append state transitions to `runstate.jsonl` (one event per line)
- `runstate.json` is a materialized view (last known state per task)
- Recovery can replay events to reconstruct state at any point

**Event schema:**
```json
{"ts":"2026-05-22T10:30:00Z","task":"01-design-system/04-component-primitives","from":"doing","to":"done","reason":"outputs verified"}
```

## Migration Path

### Phase 1: Backfill seed children into inventory (0.5.0) — IN PROGRESS
- `converge reconcile --playbook=X --scan` walks journal checkpoints, reports orphaned seed children
- `converge reconcile --playbook=X --scan --fix` backfills orphans into inventory + rebuilds runstate
- Existing playbooks run `converge reconcile --playbook=X --scan --fix` once to backfill

### Phase 2: Checkpoint validation on read (0.5.1)
- `getTaskStates()` validates completed tasks against declared outputs
- Stale checkpoints auto-downgraded, logged to `recovery.log`

### Phase 3: Append-only runstate (0.6.0)
- Introduce `runstate.jsonl` alongside `runstate.json`
- `reconcile --fix` appends events instead of overwriting
- `getTaskStates()` reads from `runstate.json` (materialized view)

## Verification

### Success Criteria
1. After a crash mid-run, `converge reconcile --playbook=X --scan --fix` restores correct state in one command
2. Seed children appear in `converge list --playbook=X` output after scan
3. `converge status` never shows phantom blocking when outputs exist on disk
4. No manual `tasks mark` needed for typical recovery scenarios

### Test Cases
- Crash during seed parent execution → reconcile detects incomplete children, marks parent `todo`
- Manual deletion of outputs → reconcile downgrades `done` → `todo`
- Stale checkpoint with `done` but no inventory entry → reconcile adds to inventory
- Conflicting checkpoint arrays (completed + failed) → reconcile deduplicates, completed wins

## Alternatives Considered

### A. New `converge recover` command alongside `reconcile`
**Rejected:** Two commands doing overlapping work causes confusion. `reconcile` already exists as the recovery surface — extend it.

### B. Keep inventory minimal, infer seed children from journal
**Rejected:** Makes inventory incomplete as source of truth. Recovery still requires scanning journal.

### C. Merge inventory + runstate into single `state.jsonl`
**Rejected:** Loses separation between write source (inventory) and read log (runstate). Harder to reason about causality.

### D. Add `converge run --force-resume` to ignore blocking
**Rejected:** Doesn't fix underlying state corruption, just bypasses it. Leads to cascading failures.

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Written and updated — single command approach |
| Phase 1: Backfill seed children | **in_progress** | `--scan` flag implemented, needs testing |
| Phase 2: Checkpoint validation | **defer** | After Phase 1 |
| Phase 3: Append-only runstate | **defer** | Future enhancement |
| Tests (TDD) | **defer** | After acceptance |
| `pnpm build` | **skip** | No code changes yet |

## Open Questions

1. Should `reconcile --scan` auto-run on every `converge run` (like git auto-gc), or stay explicit?
2. How to handle seed children with no declared outputs (pure side-effect tasks)?
3. Should inventory track spawn order (for deterministic replay)?

---

**Next Steps:**
1. Test `converge reconcile --playbook=X --scan --fix` on mezon-portal playbook
2. Verify seed children backfilled into inventory + runstate
3. Update troubleshooting docs to recommend `reconcile --scan --fix` over manual workflows
