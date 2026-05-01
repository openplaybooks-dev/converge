---
title: "converge retry"
description: "Resume from the last failure point in target/run_results.json."
sidebar:
  order: 21
---

Resume from the last failure point recorded in `target/run_results.json`. Replaces the "redo failures" intent of the old `--resume` flag. Equivalent to `converge run --select 'result:error+'`.

## Usage

```bash
converge retry [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--select`, `-s` | `result:error+` | Override the default failure selection. |
| `--exclude`, `-e` | — | Subtractive expression. |
| `--fail-fast` | off | Stop on first uncorrectable failure. |
| `--full-refresh` | off | Force non-incremental retry. |
| `--defer` | off | Use prior outputs from `--state` instead of re-running upstream tasks. |
| `--state=PATH` | auto | Defaults to the session that produced the last failures. |
| `--playbook=NAME` | (auto-detect) | Which playbook. |
| `--project-dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# Retry everything that failed in the last session.
converge retry

# Retry failures, but only within the keyframe phase.
converge retry --select 'result:error+,phase:keyframe'

# Retry with full refresh (ignore incremental materializations).
converge retry --full-refresh

# Retry and also defer unchanged upstream tasks to their prior outputs.
converge retry --defer
```

## When to use

- **After a run with failures.** Fix the root cause, then `retry` to pick up from the failure point.
- **Incremental recovery.** `retry --defer` reuses prior successful outputs and only rebuilds failures + downstream.
- **`retry` vs `run --select 'result:error+'`:** They're equivalent. `retry` is the shortcut.
