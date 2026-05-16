---
name: converge-control
description: Use when the user wants to run a converge playbook, monitor execution, fix a failed task, or re-run after changes. Triggers on "run my playbook", "monitor this run", "converge failed", "re-run the playbook", "what's the status", "retry failures".
---

# Converge Control — run and troubleshoot

## Purpose

Compile, run, and monitor a converge playbook. When something fails, diagnose from the event stream and apply surgical fixes. Keep the run moving until every DAG node passes its checks.

This skill is **only** for running and unblocking. Authoring TASK.md files, writing CLI seed tasks, choosing phases, or planning a fresh project — those belong to **`converge-planning`**.

## The mental model

Converge runs work like dbt:

```
Source                  Target
(playbook + project)    (target/{playbook}/)

  TASK.md files    →    manifest.json    (compiled DAG)
  project files    →    runstate.json    (execution state)
  seed templates   →    events.jsonl     (append-only stream)
```

One run at a time per playbook. `manifest.json` is the single source of truth — every tool reads it. Comparing `manifest.json` against `manifest.prev.json` tells you exactly what changed.

## The run loop

Four steps, in order. Stay in this loop until every node is complete or you hit a structural failure you can't fix.

### 1. Compile

```bash
converge compile .converge/playbooks/<name>/playbook.yml
```

This writes `target/{playbook}/manifest.json` — the compiled DAG. No tasks execute. Verify it exists before running:

```bash
test -f target/<playbook>/manifest.json && echo "ready" || echo "compile failed"
```

If the project has only one playbook, the path argument is optional. **Always pass it explicitly** when `.converge/playbooks/` has more than one entry.

### 2. Run

```bash
converge run .converge/playbooks/<name>/playbook.yml
```

The runner walks the DAG in topological layers. Nodes whose dependencies are satisfied execute. Nodes with unchanged fingerprints (matching `runstate.prev.json`) are cached and skipped.

Common run variations:

```bash
# Full run
converge run <playbook.yml>

# Incremental — only what changed and downstream
converge run <playbook.yml> --select 'state:modified+'

# Retry only failures from last run
converge run <playbook.yml> --select 'result:error+'

# Run one task and its descendants
converge run <playbook.yml> --select '03-build-screens+'

# Test checks without executing tasks
converge test <playbook.yml> --select 'state:modified+'
```

Run in the background so you can monitor:

```bash
converge run <playbook.yml> > /tmp/converge-run.log 2>&1 &
```

### 3. Monitor

Tail the event stream:

```bash
tail -f target/<playbook>/events.jsonl
```

Filter to the signals that matter:

```bash
tail -f target/<playbook>/events.jsonl | grep -E '(NODE_START|NODE_COMPLETE|NODE_FAIL|CHECK_FAIL|DAG_LAYER|CYCLE|ERROR)'
```

One monitor per run. Re-arm after a 1-hour timeout.

### 4. Classify and act

| Event | Meaning | Action |
|---|---|---|
| `NODE_START <id>` | Task began executing | Continue |
| `NODE_COMPLETE <id> cached` | Task skipped (fingerprint matched prior run) | Continue |
| `NODE_COMPLETE <id> fresh` | Task ran and all checks passed | Continue |
| `CHECK_FAIL <id> <checkId>` | A check failed (task may still converge) | Note it; if repeated across attempts, diagnose |
| `NODE_FAIL <id> <reason>` | Task failed all attempts | Go to step 5 |
| `DAG_LAYER 3/7` | Executing layer 3 of 7 | Continue (progress signal) |
| `CYCLE_DETECTED <ids>` | Dependency cycle found | Structural — fix `depends_on` edges, re-compile |
| `ERROR` (without NODE_FAIL) | Transient (API overload, network) | Continue — runner retries |
| Run process exits 0 | All nodes complete or cached | Verify with `converge list <playbook.yml>` |
| Run process exits non-zero | Unrecovered failure | Tail the last 30 events, go to step 5 |

Full catalog: **`reference/events.md`**.

### 5. On failure — diagnose

Load **`troubleshooting/playbook.md`** and find the symptom that matches. Each entry has a root cause, a fix recipe, and a verification step.

If the symptom matches → apply the fix, re-compile if you changed any TASK.md frontmatter, then re-run.

If the symptom is **not** in the playbook → STOP. Surface to the user with: the failing node ID, the exact event lines, the check that failed, what you've already tried, and a proposed fix. Wait for approval before patching.

### 6. After fix — re-run

```bash
# If you changed TASK.md frontmatter or depends_on:
converge compile <playbook.yml>

# Re-run failures
converge run <playbook.yml> --select 'result:error+'
```

No need to kill a process — the previous run already exited. If the process is still running (hung), kill it first:

```bash
pkill -f "converge run"
sleep 2
```

## CLI cheatsheet

See **`reference/cli.md`** for the full set. The commands you'll use most:

```bash
# Compile the DAG
converge compile <playbook.yml>

# Run
converge run <playbook.yml>

# Incremental — only changed and downstream
converge run <playbook.yml> --select 'state:modified+'

# Retry failures
converge run <playbook.yml> --select 'result:error+'

# Show DAG status
converge list <playbook.yml>

# Visualize the DAG
converge show graph <playbook.yml>

# Inspect a failed task's forensics
converge inspect <playbook.yml> --task <taskId>

# Clean state (re-run from scratch)
converge clean --select '<task>+'
```

## Hard rules

- **Compile before run.** Always. `compile` catches cycle errors and missing dependencies before execution starts.
- **Re-compile after editing TASK.md frontmatter.** `depends_on`, `inputs:`, `outputs:`, and `checks:` changes only take effect after a re-compile.
- **Don't delete `target/` mid-run.** That's the execution state. Use `converge clean --select '<task>+'` to reset specific nodes.
- **One playbook at a time.** When `.converge/playbooks/` has more than one entry, always invoke with the explicit `<playbook.yml>` path.
- **Don't re-run a completed playbook without `--select`.** A full re-run re-executes everything. Use `--select 'state:modified+'` for incremental or `--select 'result:error+'` for retries.
- **Apply known fixes; ask before novel ones.** If the symptom matches `troubleshooting/playbook.md`, apply and continue. If it doesn't, STOP and surface to the user.
- **Don't hand-edit `manifest.json` or `runstate.json`.** Fix the source (TASK.md, playbook.yml) and re-compile.

## Hand-off

| Situation | Hand off to |
|---|---|
| User wants to design a new playbook or add a phase | **`converge-planning`** |
| User asks to set up `.converge/` from scratch | **`converge-planning`** |
| Failure is in user's domain code (compile error, missing API key, ENOSPC, etc.) | **the user** — surface the error, don't try to fix it |
| Framework bug in converge core/CLI | **the user** — file an issue with the failing event lines |

## File map

```
SKILL.md                         (this file — entry point and run loop)
reference/
  cli.md                         (CLI commands you actually use)
  events.md                      (every event pattern, what it means)
troubleshooting/
  playbook.md                    (symptom → root cause → fix recipes)
```

Load **one** file per gap. Return here between.
