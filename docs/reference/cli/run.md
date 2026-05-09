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
converge run [playbook.yml] [flags]
```

## Options

### Selection flags

| Flag | Default | Effect |
|---|---|---|
| `--select`, `-s` | (all) | Selection expression. |
| `--exclude`, `-e` |: | Subtractive expression. |

### Run-mode flags

| Flag | Default | Effect |
|---|---|---|
| `--full-refresh` | off | Force non-incremental execution; rebuild from scratch (ignore fingerprints). |
| `--state=PATH` |: | Path to a prior `target/` for `state:` comparisons. |
| `--force` | off | Force-run selected nodes, bypassing completed/cached state. |
| `--seed` | off | Run only Seed seeding phase. |
| `--dry` | off | Show what would run, no execution. |

### Common flags

| Flag | Default | Effect |
|---|---|---|
| `--playbook=NAME` | (auto-detect) | Which playbook to run. |
| `--vars='{k: v}'` |: | Override playbook `vars`. |
| `--concurrency=N` | 1 | Parallelism within topological layers. |
| `--project-dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# Run the entire playbook (auto-compiles)
converge run

# Incremental: only what changed and downstream (like dbt run --select state:modified+)
converge run --select 'state:modified+'

# Retry only failures from last run
converge run --select 'result:error+'

# Run one task and everything downstream
converge run --select '03-build-screens+'

# Test checks without executing tasks
converge test --select 'state:modified+'

# Preview what would run without executing
converge run --select 'state:modified+' --dry

# Full rebuild (ignore fingerprints)
converge run --full-refresh
```

## When to use

- **Default workflow.** `converge run`: it auto-compiles, then executes.
- **Incremental.** Use `--select 'state:modified+'` to run only what changed.
- **After editing a TASK.md.** `converge run --select 'state:modified+'`: run auto-compiles to pick up changes.
- **Preview the DAG before running.** `converge compile` resolves and shows the task set without executing.
- **After a kill or crash.** Just `converge run` again: the runner reads `runstate.json` and continues from incomplete nodes.
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
