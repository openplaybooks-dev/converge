---
title: "converge test"
description: "Run only the checks of selected tasks against current state. No execution, no repair."
sidebar:
  order: 15
---

Run only the `checks:` block of selected tasks against the current state on disk. No task body is executed. No repair is attempted. Useful after manual edits: verify correctness without side effects.

## Usage

```bash
converge test --select <expression> [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--select`, `-s` | (all completed tasks) | Selection expression. |
| `--exclude`, `-e` |: | Subtractive expression. |
| `--selector` |: | Shortcut for `--select selector:NAME`. |
| `--state=PATH` |: | Path to a prior `target/` for `state:` comparisons. |
| `--playbook=NAME` | (auto-detect) | Which playbook. |
| `--project-dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# After editing a check by hand, verify it passes before re-running.
converge test --select '03-tokens'

# Run only checks for completed tasks (verify nothing drifted on disk).
converge test --select 'status:complete'

# Run checks for tasks whose check block changed (I just fixed a broken check).
converge test --select 'state:modified.checks' --state /tmp/last-good

# Test a whole phase without executing any task body.
converge test --select '@phase:render'
```

## When to use

- **After fixing a broken check.** Change the check in TASK.md, then `test` to verify it passes: no need to re-run the whole task.
- **Drift detection.** `test --select 'status:complete'` tells you whether any completed task's outputs no longer match its checks.
- **Pre-flight before `run`.** Test what's already done before proceeding with new work.
- **Don't use** when you need repair. `test` reports failures but doesn't fix anything. Use `build` or `run` for that.
