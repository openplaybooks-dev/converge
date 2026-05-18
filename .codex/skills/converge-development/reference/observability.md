# Observability — what to read on disk during a run

The stdout event stream tells you *what* the framework is doing. The journal tells you *why*. When debugging the framework itself, you need both.

All paths are relative to the example directory (e.g. `/Users/minh/Documents/converge/examples/hello-world`).

## Top-level layout (per playbook run)

```
.converge/
├── project.yaml                              project + provider config
├── playbooks/<playbook>/                     playbook source
│   ├── playbook.yml
│   └── tasks/<task>/TASK.md
├── journal/<playbook>/                       runtime state — read this for diagnosis
│   ├── manifest.json                         compiled DAG (nodes, parent_map, child_map)
│   ├── runstate.json                         execution state (node status, attempt counts)
│   └── executions/<executionId>/             per-execution directory
│       ├── events.jsonl                      execution-level events
│       └── tasks/<taskId>/
│           ├── checkpoint.json               per-task checkpoint
│           ├── status.json                   task status (pending → in_progress → complete/failed)
│           ├── events.jsonl                  per-task event log (AGENT_START, AGENT_COMPLETE, etc.)
│           ├── gaps.yml                      current gap snapshot
│           ├── summary.md                    human-readable status
│           ├── plan.md                       plan output (for containers)
│           ├── seed.json                     seed spawn record (for seed tasks)
│           └── attempts/<n>/                 one dir per attempt
│               ├── TASK.md                   materialized snapshot at attempt time
│               ├── CHECK.md                  check predicate output
│               ├── FEEDBACK.md               per-attempt gap/check feedback
│               ├── LEARN.md                  accumulated learning across attempts
│               └── logs/
│                   ├── events.jsonl          per-attempt event log (most detailed)
│                   └── log.log               raw AI session transcript
└── artifacts/<playbook>/                     task outputs (the actual work product)
```

## What each file tells you

### `journal/<playbook>/tasks/<epicId>/tasks/<taskId>/checkpoint.json`
Per-task convergence state. Watch for:
- Status transitions (`pending` → `in_progress` → `complete` / `failed` / `cancelled`)
- `progress.completedChildren` vs `progress.totalChildren` — mismatch = rollup bug
- Attempt count and last-attempt index
- For seed parents: child spawn count vs expected

```bash
# tail all task checkpoints
find .converge/journal -name "checkpoint.json" -exec tail -f {} +
```

### `journal/<playbook>/tasks/<epicId>/tasks/<taskId>/status.json`
Lightweight task status file. Faster to read than checkpoint for quick status checks. Contains status enum and timestamps.

### `journal/<playbook>/tasks/<epicId>/tasks/<taskId>/events.jsonl`
Task-level event stream. Higher-level than per-attempt events. Includes phase transitions, gap detection results, action outcomes.

```bash
# pretty-print one task's events
jq -c . .converge/journal/<playbook>/tasks/<epicId>/tasks/<taskId>/events.jsonl | less
```

### `journal/<playbook>/tasks/<epicId>/tasks/<taskId>/gaps.yml`
Current gap snapshot for this task. Lists all unresolved gaps with kind, type, severity, and description. Compare across waves to see if gaps are resolving.

### `journal/<playbook>/tasks/<epicId>/tasks/<taskId>/attempts/<n>/TASK.md`
Snapshot of TASK.md as the runner saw it at attempt n. **If this differs from the source `playbooks/<playbook>/tasks/<task>/TASK.md`, the runner is using a stale materialized copy** — known failure mode. Compare:

```bash
diff .converge/playbooks/<playbook>/tasks/<task>/TASK.md \
     .converge/journal/<playbook>/tasks/<epicId>/tasks/<taskId>/attempts/<n>/TASK.md
```

### `journal/<playbook>/tasks/<epicId>/tasks/<taskId>/attempts/<n>/CHECK.md`
What the check predicate evaluated. Use to see the gap between expected and actual output.

### `journal/<playbook>/executions/<executionId>/tasks/<taskId>/events.jsonl`
Task-level event stream. Contains `AGENT_START`, `AGENT_COMPLETE`, `AGENT_FAILED` events with provider and model metadata:

```json
{"eventType":"AGENT_START","metadata":{"phase":"run_task","provider":"codex","model":"gpt-5.4"},...}
{"eventType":"AGENT_COMPLETE","metadata":{"phase":"run_task","durationMs":20319,"provider":"codex"},...}
```

**Use these to verify which AI provider actually ran a task** — the console `🤖 AI Provider:` line reflects the resolved config, but the events are the machine-readable record.

### `journal/<playbook>/executions/<executionId>/tasks/<taskId>/attempts/<n>/logs/events.jsonl`
The most detailed per-attempt event stream. Includes: spawn, hook fires, agentfn provider calls, check evaluation, gap detection, repair attempts. **Primary diagnostic source for navigator and provider bugs.**

```bash
# pretty-print one attempt's events
jq -c . .converge/journal/<playbook>/executions/<executionId>/tasks/<taskId>/attempts/<n>/logs/events.jsonl | less
```

### `artifacts/<playbook>/...`
What the task actually produced. **Always cross-check checkpoint status against artifacts on disk** — checkpoint can lie; the artifact is ground truth.

## Useful tail commands during a run

```bash
# All task checkpoints + event streams, side by side
find .converge/journal -name "checkpoint.json" -exec tail -f {} + &
find .converge/journal -name "events.jsonl" -exec tail -f {} +

# Latest attempt's detailed events for a specific task
TASK_DIR=$(ls -dt .converge/journal/<playbook>/tasks/*/tasks/<taskId>/ 2>/dev/null | head -1)
LATEST=$(ls -t "$TASK_DIR/attempts/" 2>/dev/null | head -1)
tail -f "$TASK_DIR/attempts/$LATEST/logs/events.jsonl"

# Quick status scan across all tasks
find .converge/journal -name "status.json" -exec sh -c 'echo "{} -> $(jq -r .status {})"' \;
```

## CLI introspection commands

These are also disk readers, just packaged. Use them as a faster path than reading raw JSON:

```bash
CLI="node /Users/minh/Documents/converge/packages/cli/dist/index.js"

# Task list with status
$CLI list

# Dependency graph
$CLI show graph

# Inspect a specific task
$CLI inspect --task <task-id>

# Show cost metrics
$CLI metrics

# Verify config and structure
$CLI verify

# Show journal for a playbook
$CLI show journal
```

## Self-improvement-loop artifacts

Read `.converge/artifacts/self-improvement-loop/` as the autonomous loop's evidence trail: `journal.md`, `metrics.jsonl`, `backlog.jsonl`, `touched-files.jsonl`, `convergence.md`, and `epochs/<NNN>/verify/result.json`.

```bash
latest=$(ls -1 .converge/artifacts/self-improvement-loop/epochs | sort -n | tail -1)
jq . .converge/artifacts/self-improvement-loop/epochs/$latest/verify/result.json
jq -c . .converge/artifacts/self-improvement-loop/metrics.jsonl
jq -r .file .converge/artifacts/self-improvement-loop/touched-files.jsonl | sort | uniq -c | sort -rn
```

If a gate fails, read the matching script in `.converge/playbooks/self-improvement-loop/scripts/`; do not weaken checks or hand-edit evidence to pass.

## Adding temporary diagnostic logging

When the on-disk surface isn't enough, add `console.log` in the relevant `packages/core/src/<subsystem>/` file. Then:

1. `pnpm --filter @openplaybooks/converge-core build` (faster than full `pnpm build`).
2. `rm -rf .converge/journal/<playbook>/tasks/*` to clear journal state.
3. Re-run the example.

**Remove the `console.log` before declaring the fix done.** Don't ship debugging output. If the module already has a real logger, prefer that over raw `console.log`.
