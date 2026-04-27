# Observability — what to read on disk during a run

The stdout event stream tells you *what* the framework is doing. The journal tells you *why*. When debugging the framework itself, you need both.

All paths are relative to the example directory (e.g. `/Users/minh/Documents/converge/examples/hello-world`).

## Top-level layout (per playbook run)

```
.converge/
├── project.yaml                              project + provider config
├── playbooks/<playbook-id>/                  playbook source
│   ├── playbook.yml
│   └── tasks/<task>/TASK.md
├── journal/<playbook-id>/                    runtime state — read this for diagnosis
│   ├── checkpoint.json                       playbook-level checkpoint
│   ├── playbook.json                         materialized playbook snapshot
│   ├── sessions/<session-id>/
│   │   ├── metadata.json                     when started, args, exit status
│   │   └── events.jsonl                      session-level event log
│   └── tasks/<task-path>/
│       ├── README.md                         human-readable status
│       ├── checkpoint.json                   per-task checkpoint
│       └── attempts/<n>/                     one dir per attempt
│           ├── TASK.md                       materialized snapshot at attempt time
│           ├── CHECK.md                      check predicate output
│           ├── FEEDBACK.md                   why checks failed (only on failure)
│           ├── NEEDS.md                      gap statement
│           ├── NEEDS.result.md               gap resolution result
│           ├── data/                         structured per-attempt data (JSON)
│           └── logs/
│               ├── events.jsonl              per-attempt event log (most detailed)
│               └── predicate-logs.jsonl      check predicate execution logs
└── artifacts/<playbook-id>/                  task outputs (the actual work product)
```

## What each file tells you

### `journal/<playbook>/checkpoint.json`
Playbook-level convergence state. Watch for:
- Status transitions (`pending` → `in_progress` → `complete` / `failed` / `cancelled`)
- `progress.completedChildren` vs `progress.totalChildren` — mismatch = rollup bug
- Resume cursor — what task the runner thinks it's on

```bash
# tail across iterations
tail -f .converge/journal/<playbook>/checkpoint.json
```

### `journal/<playbook>/sessions/<session-id>/metadata.json`
One per session. Has run args, start time, exit status. Use to confirm what flags the runner actually saw vs what you passed.

### `journal/<playbook>/sessions/<session-id>/events.jsonl`
Session-level event stream. Higher-level than per-attempt events. Use to see phase transitions, parent-rollup decisions, top-level errors.

### `journal/<playbook>/tasks/<task>/checkpoint.json`
Per-task convergence state. For parents (tasks with WBS children): watch `totalChildren` and `completedChildren`. For leaves: watch attempt count and final status.

### `journal/<playbook>/tasks/<task>/attempts/<n>/TASK.md`
Snapshot of TASK.md as the runner saw it at attempt n. **If this differs from the source `playbooks/<playbook>/tasks/<task>/TASK.md`, the runner is using a stale materialized copy** — known failure mode. Compare:

```bash
diff .converge/playbooks/<playbook>/tasks/<task>/TASK.md \
     .converge/journal/<playbook>/tasks/<task>/attempts/<n>/TASK.md
```

### `journal/<playbook>/tasks/<task>/attempts/<n>/FEEDBACK.md`
Only present on failed attempts. The runner's own description of which checks failed and why. **Read this before forming a hypothesis** — often the runner already named the issue.

### `journal/<playbook>/tasks/<task>/attempts/<n>/CHECK.md`
What the check predicate evaluated. Pair with `FEEDBACK.md` to see the gap between expected and actual.

### `journal/<playbook>/tasks/<task>/attempts/<n>/NEEDS.md` and `NEEDS.result.md`
Gap statement and resolution. Useful when the convergence loop is misbehaving — shows what the runner thought it needed and what it got.

### `journal/<playbook>/tasks/<task>/attempts/<n>/logs/events.jsonl`
The most detailed per-attempt event stream. Includes: spawn, hook fires, provider calls (with token counts), check evaluation, gap detection. **Primary diagnostic source for executor and provider bugs.**

```bash
# pretty-print one attempt's events
jq -c . .converge/journal/<playbook>/tasks/<task>/attempts/<n>/logs/events.jsonl | less
```

### `journal/<playbook>/tasks/<task>/attempts/<n>/logs/predicate-logs.jsonl`
Per-check execution log. Use when a check is reporting the wrong result.

### `artifacts/<playbook>/...`
What the task actually produced. **Always cross-check checkpoint status against artifacts on disk** — checkpoint can lie; the artifact is ground truth.

## Useful tail commands during a run

```bash
# Session-level stream + checkpoint, side by side
tail -f .converge/journal/<playbook>/sessions/*/events.jsonl &
tail -f .converge/journal/<playbook>/checkpoint.json &

# Latest attempt's detailed events for a specific task
LATEST=$(ls -t .converge/journal/<playbook>/tasks/<task>/attempts/ | head -1)
tail -f .converge/journal/<playbook>/tasks/<task>/attempts/$LATEST/logs/events.jsonl
```

## CLI introspection commands

These are also disk readers, just packaged. Use them as a faster path than reading raw JSON:

```bash
# Tree of tasks + status
node /Users/minh/Documents/converge/packages/cli/dist/index.js \
  .converge/playbooks/<playbook>/playbook.yml tree

# Detailed status (also triggers parent-rollup pass — useful diagnostic)
node /Users/minh/Documents/converge/packages/cli/dist/index.js \
  .converge/playbooks/<playbook>/playbook.yml status

# Forensics on the most recent failed task
node /Users/minh/Documents/converge/packages/cli/dist/index.js \
  .converge/playbooks/<playbook>/playbook.yml inspect --last-session

# Reconcile checkpoint inconsistencies (after manual file edits)
node /Users/minh/Documents/converge/packages/cli/dist/index.js \
  .converge/playbooks/<playbook>/playbook.yml verify --fix
```

## Adding temporary diagnostic logging

When the on-disk surface isn't enough, add `console.log` in `packages/core/src/<subsystem>/`. Then:

1. `pnpm --filter @converge/core build` (faster than full `pnpm build`).
2. `converge <playbook.yml> reset` to clear journal state.
3. Re-run the example.

**Remove the `console.log` before declaring the fix done.** Don't ship debugging output. If the module already has a real logger, prefer that over raw `console.log`.
