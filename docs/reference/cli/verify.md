---
title: "converge verify"
description: "Validate project structure, TASK.md rules, and checkpoint consistency."
sidebar:
  order: 10
---

Run project validation. `verify` combines two layers:

- **Rule validation** for `PROJECT.md` and `TASK.md`
- **Checkpoint / manifest validation** for execution state when project config is available

This is the operator-facing preflight and audit command when you want to know whether definitions and recorded state still match reality.

## Usage

```bash
converge verify [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--rules` | off | Run rule-based validation only. |
| `--fix` | off | Attempt safe auto-fixes for checkpoint inconsistencies. |
| `--task=ID` | (all tasks) | Validate one task by ID. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
converge verify
converge verify --rules
converge verify --fix
converge verify --task=003-build
```

## What it checks

- `PROJECT.md` and `TASK.md` formatting and rule violations
- task-definition validity
- checkpoint / manifest drift against the filesystem
- single-task validation for a targeted task id

`verify` is definition-focused and consistency-focused. For runtime-state problems like stale sentinels, phantom work items, or tripped repair circuits, use [`doctor`](./doctor).

