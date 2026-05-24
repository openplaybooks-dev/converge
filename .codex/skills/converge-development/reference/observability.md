# Observability — what to read on disk during a run

The stdout event stream tells you *what* the framework is doing. The journal and inventory tell you *why*. When debugging the framework itself, you need both.

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
│   ├── runstate.json                         execution state (node status, attempts, fingerprints)
│   ├── events.jsonl                          playbook-level event stream
│   └── tasks/<taskId>/
│       ├── status.json                       task status (pending → in_progress → complete/failed)
│       ├── gaps.yml                          current gap snapshot
│       ├── summary.md                        human-readable status
│       ├── plan.md                           plan output (for containers)
│       ├── exec/                             $CONVERGE_TASK_DIR — persists across attempts (RFC 0021)
│       │   ├── spawn/                        $CONVERGE_SPAWN_DIR — spawn directory
│       │   │   ├── STATUS.md                 single AI-facing transparency surface (one [x]/[ ] row per child + fix: blocks)
│       │   │   └── <childId>/
│       │   │       ├── EXPANDED.md           framework-rendered template TASK.md with {{...}} substituted
│       │   │       └── EVIDENCE.json         per-child failure detail (machine-readable)
│       │   ├── spawn.plan.jsonl              (legacy) child manifest emitted by mode: spawner / converger body (one JSON row per child)
│       │   ├── spawn.plan.result.jsonl       (legacy) per-row apply outcome — `{"ok":true}` or `{"ok":false,"errorCode":...}`
│       │   ├── wave.counter                  current wave number for mode: converger (persists across re-leases)
│       │   ├── halt.marker                   body's explicit "I'm done" signal for a converger — highest-priority halt
│       │   └── mode-violation.json           RFC 0022 contract violation evidence (errorCode + declaredMode + fixHint)
│       ├── FEEDBACK.md                       latest attempt feedback
│       ├── LEARN.md                          accumulated learning across attempts
│       └── attempts/<n>/
│           ├── TASK.md                       materialized snapshot at attempt time
│           ├── CHECK.md                      check predicate output
│           └── logs/
│               ├── events.jsonl              per-attempt event log (most detailed)
│               └── log.log                   raw AI session transcript
└── inventory/<playbook>/                     runtime ledger for spawned tasks
    ├── tasks.jsonl                           flat task inventory
    ├── goals/<goalId>.done                   sentinels (`converge goals done`)
    └── spawned/<taskId>/TASK.md              rendered spawned task definitions
```

## What each file tells you

### `journal/<playbook>/tasks/<taskId>/status.json`
Lightweight task status file. Faster to read than checkpoint for quick status checks. Contains status enum and timestamps.

### `journal/<playbook>/tasks/<taskId>/gaps.yml`
Current gap snapshot for this task. Lists all unresolved gaps with kind, type, severity, and description. Compare across waves to see if gaps are resolving.

### `journal/<playbook>/tasks/<taskId>/attempts/<n>/TASK.md`
Snapshot of TASK.md as the runner saw it at attempt n. **If this differs from the source `playbooks/<playbook>/tasks/<task>/TASK.md`, the runner is using a stale materialized copy** — known failure mode. Compare:

```bash
diff .converge/playbooks/<playbook>/tasks/<task>/TASK.md \
     .converge/journal/<playbook>/tasks/<taskId>/attempts/<n>/TASK.md
```

### `journal/<playbook>/tasks/<taskId>/attempts/<n>/CHECK.md`
What the check predicate evaluated. Use to see the gap between expected and actual output.

### `journal/<playbook>/tasks/<taskId>/attempts/<n>/logs/events.jsonl`
The most detailed per-attempt event stream. Includes: spawn, hook fires, agentfn provider calls, check evaluation, gap detection, repair attempts. **Primary diagnostic source for navigator and provider bugs.**

```bash
# pretty-print one attempt's events
jq -c . .converge/journal/<playbook>/tasks/<taskId>/attempts/<n>/logs/events.jsonl | less
```

### Task outputs on disk
Each task's `outputs:` declarations point at files anywhere in the workspace — whatever the playbook author chose. **Always cross-check checkpoint status against the declared outputs** — checkpoint can lie; the file on disk is ground truth.

## Useful tail commands during a run

```bash
# All task checkpoints + event streams, side by side
tail -f .converge/journal/<playbook>/events.jsonl &
find .converge/journal/<playbook>/tasks -path '*/logs/events.jsonl' -exec tail -f {} +

# Latest attempt's detailed events for a specific task
TASK_DIR=".converge/journal/<playbook>/tasks/<taskId>"
LATEST=$(ls -t "$TASK_DIR/attempts/" 2>/dev/null | head -1)
tail -f "$TASK_DIR/attempts/$LATEST/logs/events.jsonl"

# Quick status scan across all tasks
find .converge/journal/<playbook>/tasks -name "status.json" -exec sh -c 'echo "{} -> $(jq -r .status {})"' \;
```

## CLI introspection commands

These are also disk readers, just packaged. Use them as a faster path than reading raw JSON:

```bash
CLI="node /Users/minh/Documents/converge/packages/cli/dist/index.js"

# Task list with status
$CLI list --playbook <name>

# Dependency graph
$CLI show graph --playbook <name>

# Inspect a specific task
$CLI inspect --playbook <name> --task <task-id>

# Show cost metrics
$CLI show metrics --playbook <name>

# Verify config and structure
$CLI playbook validate <name>

# Show journal for a playbook
$CLI show journal --playbook <name>
```

## Self-improvement-loop evidence trail

The `self-improvement-loop` playbook writes its own evidence directory at `.converge/artifacts/self-improvement-loop/` (a per-playbook convention chosen by that playbook, not a framework directory). Read it for the autonomous loop's evidence trail: `journal.md`, `metrics.jsonl`, `backlog.jsonl`, `touched-files.jsonl`, `convergence.md`, and `epochs/<NNN>/verify/result.json`.

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
2. `rm -rf .converge/journal/<playbook> .converge/inventory/<playbook>` to clear runtime state.
3. Re-run the example.

**Remove the `console.log` before declaring the fix done.** Don't ship debugging output. If the module already has a real logger, prefer that over raw `console.log`.
