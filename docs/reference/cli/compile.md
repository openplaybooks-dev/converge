---
title: "converge compile"
description: "Resolve the DAG and write target/manifest.json. No execution by default."
sidebar:
  order: 16
---

Resolves the playbook DAG and writes `.converge/target/{playbook}/manifest.json` with every known task node, annotated with `concrete` / `expected` / `frontier` state. No task execution by default. With `--seed`, runs Seed scripts of selected parents to materialize their children into the DAG — turning `frontier` nodes into `concrete` ones.

## Usage

```bash
converge compile [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--select`, `-s` | (all) | Which tasks to resolve in the manifest. |
| `--exclude`, `-e` | — | Subtractive expression. |
| `--selector` | — | Shortcut for `--select selector:NAME`. |
| `--seed` | off | Run Seed scripts of selected parents, materialize children to disk, rewrite the manifest. Cheap — scripts run, task bodies don't. |
| `--inc` | off | With `--seed`, allow re-seeding already-seeded Seed parents. |
| `--playbook=NAME` | (auto-detect) | Which playbook. |
| `--project-dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# Resolve the DAG without executing anything. Read-only.
converge compile
# wrote target/manifest.json
#   concrete:  4
#   expected:  0
#   frontier:  1   (03-tokens/002-craft has unseeded Seed)

# After running an upstream catalog task, recompile to see the new expected children.
converge compile
#   expected: 50   (one per entry in tokens-catalog.json)

# Materialize Seed children to disk (scripts only, no task body execution).
converge compile --seed --select '03-tokens/002-craft'

# Preview what would compile, without writing anything.
converge compile --dry
```

## When to use

- **Before `run` with `--select`.** Compile first to see the resolved task set. `converge list --select <expr>` is the lighter-weight alternative.
- **After running an upstream catalog task.** Recompile to turn `frontier` into `expected` or `concrete`.
- **Seed before run.** If a selection crosses a frontier, `compile --seed` resolves it first.
- **`--seed` is cheap** — it runs Seed scripts (typically read-a-file-and-spawn) but not the expensive task work (LLM calls, rendering).
