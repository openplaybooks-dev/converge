---
title: "converge run"
description: "Execute selected tasks via the convergence loop. The primary command."
sidebar:
  order: 3
---

The primary command. Runs the convergence loop: pick pending tasks in dependency order, execute them, run their checks, route any failures through the repair pipeline, repeat until done or until a structural failure halts the run.

`run` takes the full `--select` / `--exclude` DSL. Without a selection, it runs the entire playbook.

## Usage

```bash
converge run --select <expression> [options]
```

## Options

### Selection flags

| Flag | Default | Effect |
|---|---|---|
| `--select`, `-s` | (all) | Selection expression (§4 of the design doc). |
| `--exclude`, `-e` | — | Subtractive expression. |
| `--selector` | — | Shortcut for `--select selector:NAME`. |

### Run-mode flags

| Flag | Default | Effect |
|---|---|---|
| `--full-refresh` | off | Force non-incremental execution; rebuild from scratch. |
| `--defer` | off | Use prior outputs from `--state` instead of re-running upstream tasks. |
| `--state=PATH` | — | Path to a prior `target/` for `state:` comparisons. |
| `--fail-fast` | off | Stop on first uncorrectable failure (default for `build`). |
| `--dry` | off | Print the would-run plan in selection order, no execution. |
| `--step` | off | Run only one iteration, then exit. |
| `--force` | off | Force-run selected tasks, bypassing blocked/completed state. |
| `--wbs` | off | Run only WBS seeding phase for selected tasks. |

### Common flags

| Flag | Default | Effect |
|---|---|---|
| `--playbook=NAME` | (auto-detect) | Which playbook to run. |
| `--vars='{k: v}'` | — | Override playbook `vars`. |
| `--threads=N` | — | Parallelism cap. |
| `--project-dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# Run the entire playbook.
converge run

# Run one task and everything downstream.
converge run --select '03-tokens+'

# Re-run what failed last session, plus everything downstream.
converge run --select 'result:error+'

# Run anything tagged image, excluding completed tasks.
converge run --select 'tag:image' --exclude 'status:complete'

# Run only what changed since last good run, deferring upstream.
converge run --select 'state:modified.body' --defer --state /tmp/last-good

# Re-seed every unseeded WBS parent.
converge run --select 'wbs:unseeded' --wbs

# Full rebuild (ignore incremental materializations).
converge run --full-refresh

# Preview what would run without executing.
converge run --select 'phase:render+' --dry
```

## When to use

- **Default workflow.** `converge run` is the primary verb. Use it for everyday execution.
- **Prefer `build`** when you want fail-fast semantics (CI/CD, post-edit rebuild).
- **Prefer `test`** when you only want to re-verify checks without re-executing.
- **After a kill or crash.** Resume is the default — just run `converge run` again. The runner recovers stuck tasks left in `running` state automatically.
- **After editing a TASK.md.** Run `converge compile` then `converge list --select 'state:modified+' --state /tmp/last-good` to see what changed before committing to a run.
- **Stuck on one task.** `converge run --select '<task>' --force` to bypass the blocked-state guard. Fix the underlying issue first.

## Caveats

- `--full-refresh` restarts incremental tasks from scratch. For wiping journal state entirely, use `converge clean --select '*'` then `converge run`.
- Resume is automatic after a hard-kill (`kill -9`) — the runner reclaims stale playbook locks via PID alive-check.
- Always quote selection expressions to avoid shell glob expansion: `--select '03-tokens+'` not `--select 03-tokens+`.

For the full selection DSL, see [`converge select`](./select).
For the convergence loop internals, see [Advanced: the navigator graph](/advanced/01-navigator-graph) and [JIT graph construction](/advanced/02-jit-graph-construction).
