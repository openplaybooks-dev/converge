---
title: "converge run"
description: "Execute the DAG in topological order. The primary command."
sidebar:
  order: 3
---

The primary command. Auto-compiles the DAG, walks nodes in topological layers, executes each node (AI agent + shell checks), caches unchanged nodes via fingerprint comparison, and retries failed nodes up to the attempt cap.

`run` takes the full `--select` / `--exclude` DSL. Without a selection, it runs the entire playbook.

## Usage

```bash
converge run [filter] [options]
```

## Mode flags

These flags replace the former separate commands (`build`, `test`, `retry`, `compile`):

| Flag | Effect | Replaces |
|---|---|---|
| (default) | Full convergence loop: execute, check, retry | `run` |
| `--fail-fast` | Stop on first uncorrectable failure | `build` |
| `--resume` | Resume from the last failure point | `retry` |
| `--dry` | Print the would-run preview, no execution | `compile` |

## Options

### Selection flags

| Flag | Default | Effect |
|---|---|---|
| `--select`, `-s` | (all) | Selection expression. |
| `--exclude`, `-e` | — | Subtractive expression. |
| `--selector` | — | Shortcut for `--select selector:NAME`. |

### Execution flags

| Flag | Default | Effect |
|---|---|---|
| `--full-refresh` | off | Force non-incremental execution; ignore fingerprints. |
| `--state=PATH` | — | Path to a prior `target/` for `state:` comparisons. |
| `--defer` | off | Use prior outputs instead of re-running upstream. |
| `--step` | off | Run one iteration, then stop. |

### Common flags

| Flag | Default | Effect |
|---|---|---|
| `--playbook=NAME` | (auto-detect) | Which playbook to run. |
| `--dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# Run the entire playbook.
converge run

# Incremental: only what changed and downstream.
converge run --select 'state:modified+'

# Fail-fast mode (replaces "build").
converge run --fail-fast
converge run --fail-fast --select=03-implement

# Resume from last failure (replaces "retry").
converge run --resume

# Preview what would run (replaces "compile").
converge run --select 'state:modified+' --dry

# Full rebuild (ignore fingerprints).
converge run --full-refresh

# Retry only failures from last run.
converge run --select 'result:error+'

# Run one task and everything downstream.
converge run --select '03-build-screens+'
```

## When to use

- **Default workflow.** `converge run` — auto-compiles, then executes.
- **CI/CD.** `converge run --fail-fast` for deterministic, stop-on-first-error behavior.
- **Incremental.** `converge run --select 'state:modified+'` to run only what changed.
- **After a kill or crash.** `converge run --resume` to pick up where you left off.
- **Preview before running.** `converge run --dry` to resolve and inspect the DAG without executing.
- **Stuck on one task.** Fix the underlying issue, then `converge run --select '<task>' --force`.

## Target directory

Execution state lives at `.converge/target/{playbook}/`:

```
target/{playbook}/
  manifest.json        : compiled DAG
  manifest.prev.json   : previous manifest (for change detection)
  runstate.json        : execution state (overwritten each run)
  runstate.prev.json   : previous runstate (for fingerprint caching)
  events.jsonl         : append-only event stream
```

For the full selection DSL, see [`converge select`](./select).
