---
title: Task Body Environment Variable Injection
status: draft
source: ui-add playbook debugging session (2026-05-23)
tags: [environment, spawner, task-execution, CONVERGE_SPAWN_DIR]
created: 2026-05-23
---

## Problem

When a `mode: spawner` task's body script runs, it cannot access `$CONVERGE_SPAWN_DIR` or other converge-specific environment variables that the framework sets for task execution workers.

The body scripts in spawner tasks call `converge spawn` from `$CONVERGE_SPAWN_DIR` but the environment variable is not set in the execution context, causing check commands like:

```bash
test -f "$CONVERGE_SPAWN_DIR/STATUS.md" && grep -qv "^\- \[ \]" "$CONVERGE_SPAWN_DIR/STATUS.md" || exit 1
```

to always fail (exit 1) because `$CONVERGE_SPAWN_DIR` expands to empty string.

## Root Cause Analysis

**The issue:** When the task execution worker runs a task body script, it does not inject converge-specific environment variables into the subprocess environment.

**Expected env vars for task bodies:**
- `CONVERGE_TASK_DIR` — absolute path to task's execution directory
- `CONVERGE_SPAWN_DIR` — spawn directory under exec dir (`.converge/journal/<playbook>/tasks/<task-id>/exec/spawn`)
- `CONVERGE_TASK_ID` — current task ID
- `CONVERGE_PLAYBOOK` — current playbook name

**Current behavior:** The `claudefn.ts` agent function inherits `process.env` but does NOT inject these converge-specific vars before spawning the subprocess that executes the task body.

## Proposed Solution

1. **In the task execution worker (agentfn/claudefn.ts):**
   - Before executing a task body, inject `CONVERGE_TASK_DIR`, `CONVERGE_SPAWN_DIR`, and other context vars into `spawnEnv`
   - The spawn dir path should be computed from `execDirFor(playbook, taskId)` which returns `.converge/journal/<playbook>/tasks/<task-id>/exec`

2. **Example injection (pseudocode):**
```typescript
// In claudefn.ts before spawning task body
const taskExecDir = join(workspace, execDirFor(playbook, taskId));
spawnEnv["CONVERGE_TASK_DIR"] = taskExecDir;
spawnEnv["CONVERGE_SPAWN_DIR"] = join(taskExecDir, "spawn");
spawnEnv["CONVERGE_TASK_ID"] = taskId;
spawnEnv["CONVERGE_PLAYBOOK"] = playbook;
```

3. **Alternative approach — use vars injection:**
   - The playbook executor already has `injectVarsIntoTaskMd()` which substitutes `{{vars}}` in TASK.md
   - Could extend this to also inject `vars.spawn_dir`, `vars.exec_dir`, etc. into the runtime context

## Verification

```bash
# After fix, this check should pass in a spawner task body:
echo "SPAWN_DIR=$CONVERGE_SPAWN_DIR"
# Should print: SPAWN_DIR=/absolute/path/to/.converge/journal/<playbook>/tasks/<task-id>/exec/spawn

# Check that STATUS.md exists at that path:
test -f "$CONVERGE_SPAWN_DIR/STATUS.md" && echo "STATUS.md found" || echo "STATUS.md missing"
```

## Files Affected

- `packages/claudefn/src/claudefn.ts` — inject CONVERGE_* env vars in `spawnTaskBody()` or equivalent
- `packages/core/src/task/spawn/exec-dir.ts` — already has `execDirFor()` helper, use it
- Potentially `packages/agentfn/src/` if agentfn also executes task bodies

## Relationship to RFC 0024 (Spawn Protocol)

RFC 0024 defines the spawn protocol with `converge spawn` CLI invocations and `STATUS.md` transparency surface. This RFC is about ensuring the **body execution environment** correctly receives `CONVERGE_SPAWN_DIR` so the body can run those invocations.

## Progress

| Item | Status |
|------|--------|
| RFC document | **done** |
| Root cause analysis | **done** |
| buildTaskEnv() fix (add spawnDir param + auto-derive from taskDir) | **done** |
| Unit tests (body-env-injection.test.ts) | **done** |
| run-spawner.ts env inheritance fix | **done** |
| Build verification | **done** |