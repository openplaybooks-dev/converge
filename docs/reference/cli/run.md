---
title: "converge run"
description: "Execute the autonomous agent loop. The main command."
sidebar:
  order: 3
---

The primary command. Runs the convergence loop: pick a pending task, execute it, run its checks, route any failures through the repair pipeline, repeat until done or until a structural failure halts the run.

## Usage

```bash
converge run [filter] [options]
```

The optional `filter` narrows execution to tasks matching a substring.

## Options

### Run-mode flags

| Flag | Default | Effect |
|---|---|---|
| `--playbook=NAME` | (auto-detect) | Run a named playbook (generates the epic, then executes). |
| `--step` | off | Run only one iteration, then exit. Debug mode. |
| `--force` | off | Force-run a filtered task, bypassing blocked/completed state. |
| `--resume` | off | Resume from interrupted state. Recovers stuck tasks left in `running`. **Use this after any kill.** |
| `--restart` | off | Reset all tasks to pending and start fresh. **Destructive — kills progress.** |
| `--dry`, `--plan` | off | Planning only, no execution. |
| `--preflight` | off | Run AI strategy selection but stop before executing. |
| `--unblock` | off | With `--step`, find first blocked task and run UnblockStrategy. |
| `--wbs` | off | Run only WBS seeding phase. |
| `--inc` | off | With `--wbs`, allow re-seeding already-seeded WBS parents. |

### Behavior caps

| Flag | Default | Effect |
|---|---|---|
| `--max-duration=N` | `259200000` (72h) | Maximum wall-clock duration in milliseconds. |
| `--check-interval=N` | `5000` (5s) | How often to poll for task state changes. |
| `--auto-fix=BOOL` | `true` | Enable auto-fixing via the repair pipeline. |
| `--self-plan=BOOL` | `true` | Enable self-planning (the AI proposes its own next moves when stuck). |

### Common flags

| Flag | Default | Effect |
|---|---|---|
| `--verbose`, `-v` | off | Verbose output. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
# Default — execute the entire playbook from current state.
converge run

# Resume after a kill or crash.
converge run --resume

# Run one iteration, then stop. Useful for debugging the next-step decision.
converge run --step

# Filter to just tasks matching 'build':
converge run build

# Restart from scratch, deleting all journal progress.
converge run --restart

# Plan only — show what would run without doing it.
converge run --dry

# Cap a long-running playbook to 4 hours.
converge run --max-duration=14400000
```

## Modes

The run *mode* is configured in `playbook.yml`:

- **`oneoff`** — run once to completion. Most playbooks.
- **`converge`** — keep iterating as long as there's pending work; suitable for queue-driven work.
- **`loop`** — periodic re-runs (cron-style); suitable for scheduled refresh playbooks.

`--step`, `--resume`, `--restart`, etc. are *run-time* modifiers that work across all modes.

## When to use which

- **First run**: `converge run`.
- **After a kill or crash**: `converge run --resume`. Always. The runner refuses to start otherwise.
- **After editing a TASK.md by hand**: `converge run --resume` (the framework re-checks edited tasks via cheap re-validation; full re-execution only if the cheap check fails).
- **Stuck on one task**: `converge run --force <task-filter>` to bypass the blocked-state guard. **Verify the task can actually proceed first** — usually you need to fix the underlying issue.
- **Want to preview**: `converge run --dry` or `converge run --preflight`.

## Caveats

- `--restart` is destructive. It deletes journal state for all tasks. Use `reset <playbook> <taskPath>` for surgical resets instead.
- `--resume` after a hard-kill (`kill -9`) reclaims stale playbook locks via PID alive-check. No manual cleanup needed in normal cases.
- The default 72-hour `--max-duration` is generous because long playbooks exist; if a run is hung, kill it and `--resume` rather than waiting.

For the architectural picture of what `run` actually does step-by-step, see [Advanced: the navigator graph](/advanced/01-navigator-graph) and [JIT graph construction](/advanced/02-jit-graph-construction).
