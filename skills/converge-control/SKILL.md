---
name: converge-control
description: Use when the user wants to run a converge playbook, monitor a running converge process, fix a stuck run, or finish a partially-converged playbook. Triggers on phrases like "run my playbook", "monitor this run", "the run is stuck", "converge failed", "resume the run", "babysit the playbook".
---

# Converge Control — run-and-troubleshoot

## Purpose

Launch a converge playbook, monitor its event stream, recognize what each event means, apply small surgical fixes when the run gets stuck, and keep it moving until it completes.

This skill is **only** for running and unblocking. Authoring TASK.md files, writing seed scripts, choosing phases, or planning a fresh project — those belong to **`converge-planning`**.

## When to invoke

Trigger on user requests like:

- "Run my playbook" / "Start converge" / "Kick off the build"
- "Monitor this run" / "Watch the converge process"
- "The run is stuck on …" / "Why is converge looping?"
- "It said 'Max iterations reached' / 'did not converge' / 'Validation failed'"
- "Resume the run" / "Pick up where converge left off"

Do **not** invoke for:

- Designing a new playbook → `converge-planning`
- Writing/editing TASK.md frontmatter from scratch → `converge-planning`
- Setting up `.converge/` for the first time → `converge-planning`'s setup phase

## The babysitter loop

Six steps, in order. Stay in this loop until the run exits 0 or you hit a structural failure you can't fix.

### 1. Launch

```bash
node /path/to/converge/packages/cli/dist/index.js \
  .converge/playbooks/<name>/playbook.yml run \
  --max-iterations 250
```

- **Always pass the explicit playbook.yml path** when the project has more than one playbook. Without it, `converge run` may pick a different playbook than intended.
- **Always pass `--max-iterations 250`** (or higher). The default is 100 and trips silently on long playbooks.
- **Resume is automatic.** `converge run` picks up where the last session left off. Use `converge retry` to explicitly redo only the failures from the last session.
- **Use `--select` to scope to specific tasks** (replaces the old `--filter` flag). Example: `--select '03-build-screens+'`.
- Run in the background so you can attach a Monitor.

### 2. Arm a Monitor with a focused filter

```bash
tail -f <output-file> | grep -E --line-buffered "(❌|FAIL|Error|Exception|Overloaded|Max iterations|did not converge|Validation failed|seeding failed|Task.*completed|Starting:|Iteration|Progress:|All gaps resolved|Auto-completed parent|exited)"
```

Strip `⚠️ project.yaml not found` — it's a known cosmetic warning, not a real issue.

One Monitor per run. Re-arm with the same filter after a 1-hour timeout.

### 3. Classify each event

| Pattern | Class | Action |
|---|---|---|
| `🎬 Starting: <task>` + `── Iteration N ──` increments | progress | continue watching |
| `📍 Progress: X/Y` increases | progress | continue watching |
| `✅ All gaps resolved` | progress | continue watching |
| `↻ Auto-completed parent` | progress | continue watching |
| `✅ Task completed` | spawn-done (NOT always task-done) | continue watching; wait for next `🎬 Starting:` |
| `Overloaded` / `API Error: 529` | transient | continue, runner retries |
| `📋 FEEDBACK.md written (N check(s) failed)` on first attempt | normal | runner will retry |
| `⚠️ project.yaml not found` | cosmetic | ignore |
| `❌ Validation failed` then `🎬 Starting:` next task | self-recovered | verify on disk, continue |
| `Max iterations (N) reached` | cap hit | kill, bump cap, `--resume` |
| `Previous session exited with status: cancelled` on launch | needs flag | re-launch with `--resume` |
| `❌ Gap resolution failed - all strategies exhausted` repeated | structural | go to step 4 |
| Run process exits non-zero | structural | tail output, go to step 4 |

Full catalog: **`reference/events.md`**.

### 4. On structural failure → diagnose

Load **`troubleshooting/playbook.md`** and find the symptom that matches. Each entry has a fix recipe and a verification step.

If the symptom is in the playbook → apply the fix.
If the symptom is **not** in the playbook → STOP. Surface the issue to the user with: the failing task ID, the exact log lines, what you've already tried, and a proposed fix. Wait for approval before patching.

### 5. After fix → relaunch

```bash
# kill if process is still running
pkill -9 -f "node.*cli/dist/index.js run"
sleep 2

# relaunch (resume is automatic)
node /path/to/converge/packages/cli/dist/index.js \
  .converge/playbooks/<name>/playbook.yml run \
  --max-iterations 250
```

Re-arm the Monitor.

### 6. Stop conditions

Exit the loop when **any** of:

- Run process exits 0 and `converge <playbook.yml> list` shows all phases ✓.
- A structural failure you can't fix (escalate to user with full context).
- The user asks you to stop.

## CLI cheatsheet (most-used during a run)

See **`reference/cli.md`** for the full set. The ones you'll hit constantly:

```bash
# Launch (path-form prevents foreign-playbook hijack)
converge .converge/playbooks/<name>/playbook.yml run --max-iterations 250

# List tasks with status (was `status`)
converge .converge/playbooks/<name>/playbook.yml list

# Clean a single failed task subtree (was `reset`)
converge clean --select '<task>+'

# Reconcile checkpoint inconsistencies (was `verify --fix`)
converge debug --fix
```

## Hard rules — STOP and re-route

- **Don't `--full-refresh` an in-progress run.** That nukes finished work. Resume is automatic — just re-run.
- **Don't kill the run on transient API errors** (529, network blips). Runner retries on its own.
- **Don't edit a TASK.md without also patching the materialized journal copy.** The runner snapshots TASK.md per attempt; source-only edits don't take effect until next attempt.
- **Don't trust `converge list` exit-state alone.** When a phase shows `seeded` or `pending`, also check the actual output files on disk before deciding work isn't done.
- **One playbook at a time.** When `.converge/playbooks/` has more than one entry, always invoke with the explicit `<playbook.yml>` path.
- **Apply known fixes; ask before novel ones.** If the symptom matches `troubleshooting/playbook.md`, apply and continue. If it doesn't, STOP and surface to the user before patching.

## Hand-off

| Situation | Hand off to |
|---|---|
| User wants to design a new playbook or add a phase | **`converge-planning`** |
| User asks to set up `.converge/` from scratch | **`converge-planning`** |
| Failure is in user's domain code (Dart compile error, missing API key, ENOSPC, etc.) | **the user** — surface the error, don't try to fix it |
| Framework bug in converge core/CLI | **the user** — file an issue with the failing log lines |

## File map

```
SKILL.md                         (this file — entry point and loop)
reference/
  cli.md                         (CLI commands you actually use)
  events.md                      (every run-output pattern, what it means)
troubleshooting/
  playbook.md                    (symptom → root cause → fix recipes)
```

Load **one** file per gap. Return here between.
