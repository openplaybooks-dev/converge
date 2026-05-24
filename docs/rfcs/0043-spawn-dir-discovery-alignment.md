---
title: Seed Parent Detection — No Children Revert Bug
status: draft
source: ui-add playbook debugging session (2026-05-23)
tags: [spawner, seed, gap-detection, lifecycle]
created: 2026-05-23
---

**Deprecated:** References to `spawn.yml` in this RFC reflect the pre-RFC 0031 design. The `spawn.yml` file-based invocation surface was superseded by RFC 0031 (unified `tasks.jsonl` / `converge spawn` CLI command). This RFC is kept for historical reference only.

## Problem

When a `mode: spawner` task (also called "seed parent") completes without spawning any children, the framework logs:

```
⚠️  Seed parent 04-features marked complete but has no children — reverting to pending
```

This causes the task to revert to "pending" status and re-execute on every subsequent run, creating an infinite re-try loop.

## Root Cause Analysis

**Location:** Likely in `packages/core/src/task/unit/run.ts` or the gap resolution logic.

**Flow:**
1. A `mode: spawner` task runs its body (spawner script)
2. The script writes `spawn.yml` files under `$CONVERGE_SPAWN_DIR/<child-id>/spawn.yml`
3. The framework's `ingestSpawnDir()` should register those children in the ledger
4. But when `spawn.yml` files exist in the **global** spawn dir (`.converge/spawn/`) instead of the **task's exec spawn dir** (`.converge/journal/<playbook>/tasks/<task-id>/exec/spawn/`), the framework does not discover them
5. Result: the seed parent completes without registered children
6. On re-run, the completion-check sees no children and reverts to pending

**Root cause:** The spawn discovery looks in `$CONVERGE_TASK_DIR/spawn/` (per-task exec dir) but the body script writes to `$CONVERGE_SPAWN_DIR` which resolves to `.converge/spawn/` (global).

## Key Insight: CONVERGE_SPAWN_DIR vs TASK_DIR

The framework has two different spawn directory concepts:
1. **Global spawn dir:** `.converge/spawn/` — used by some body scripts directly
2. **Per-task exec spawn dir:** `.converge/journal/<playbook>/tasks/<task-id>/exec/spawn/`

When the task body uses `$CONVERGE_SPAWN_DIR` (from env), it gets the global path. But the framework's child discovery looks in the task-specific exec dir.

**This is the core bug:** The env var `CONVERGE_SPAWN_DIR` is set to the global spawn dir, but the framework's spawn discovery looks in the per-task exec spawn dir.

## Proposed Solution

### Option A: Align CONVERGE_SPAWN_DIR with exec spawn dir (recommended)

1. **Fix `CONVERGE_SPAWN_DIR` injection:** The env var should point to `execDir/spawn`, not `.converge/spawn/`

2. **In claudefn.ts or task execution:** When setting up the task body environment:
   ```typescript
   const execSpawnDir = join(execDir, "spawn");
   spawnEnv["CONVERGE_SPAWN_DIR"] = execSpawnDir;
   ```

3. **Migration:** Body scripts that write directly to `.converge/spawn/<id>/spawn.yml` will need to use `$CONVERGE_SPAWN_DIR` instead (which now correctly points to per-task spawn).

### Option B: Make spawn discovery also check global spawn dir

If backward compatibility is needed, the spawn discovery could check both:
1. First check `$CONVERGE_TASK_DIR/spawn/` (per-task)
2. Then check `.converge/spawn/` (global legacy)

## Verification

```bash
# After fix, spawner task should:
# 1. Write spawn.yml to $CONVERGE_SPAWN_DIR (per-task exec/spawn/)
# 2. Children get registered in ledger
# 3. Task completes with children, no revert
```

## Files Affected

- `packages/claudefn/src/claudefn.ts` — inject correct `CONVERGE_SPAWN_DIR` env var
- `packages/core/src/task/spawn/apply.ts` — `ingestSpawnDir()` should handle per-task spawn dir
- Body scripts in playbooks that use `$CONVERGE_SPAWN_DIR` directly (migrate to use env var)

## Relationship to RFC 0042 (Task Body Env Injection)

RFC 0042 covers the general mechanism of injecting environment variables into task bodies. This RFC is specifically about fixing the `CONVERGE_SPAWN_DIR` value to point to the correct per-task spawn directory.

## Progress

| Item | Status |
|------|--------|
| RFC document | **done** |
| Root cause identified | **done** |
| Solution options | **done** |
| run-spawner.ts: set CONVERGE_TASK_DIR and CONVERGE_SPAWN_DIR before body runs | **done** |
| run-spawner.ts: pass process.env to execSync for passthrough body | **done** |
| Unit tests | **defer** |
| Build verification | **done** |