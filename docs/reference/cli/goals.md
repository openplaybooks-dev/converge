---
title: "converge goals"
description: "Evaluate project goals and plan remediation."
sidebar:
  order: 13
---

Evaluate whether the project's goals (declared in `project.yml` or via the goal-planner system) are currently satisfied. Optionally generate a remediation plan when they aren't.

## Usage

```bash
converge goals [goal] [options]
```

The optional positional arg names a specific goal; without it, all goals are evaluated.

## Options

| Flag | Default | Effect |
|---|---|---|
| `--plan` | off | Generate remediation plan (writes new GOAL.md tasks if needed). |
| `--dry` | off | Preview remediation plan without writing files. |
| `--dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# Evaluate all goals.
converge goals

# Evaluate one specific goal.
converge goals "ship by friday"

# Generate a remediation plan for unmet goals.
converge goals --plan

# Preview the plan without writing.
converge goals --plan --dry
```

## What goals are

A goal is a higher-level outcome — "the landing page deploys to preview", "the docs build cleanly", "all checks pass on main". Goals are evaluated by running their declared checks; if any fail, the goal is unmet.

When `--plan` is passed and a goal is unmet, the framework generates GOAL.md tasks (a special task shape that the goal-planner system runs) representing the work needed to satisfy the goal.

## When to use

- **Before running.** `converge goals` shows what's currently met vs. unmet — useful as a "what's left to do" snapshot.
- **For dynamic playbooks.** When you want the framework to *generate* the work needed to close a gap rather than declaring it upfront.
- **As a CI gate.** `converge goals` exits non-zero when goals are unmet — suitable for pre-deploy verification.

## Caveats

- Goals are an advanced feature. Most simple playbooks don't need them — the per-task checks are sufficient.
- `--plan` can generate non-trivial new task structures. Always run with `--dry` first to see what will be written.
