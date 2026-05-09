---
title: "converge build"
description: "Run, check, and repair selected tasks in dependency order. The 'do everything' verb."
sidebar:
  order: 14
---

Run + check + repair: executes the full convergence loop for selected tasks in dependency order, failing fast on the first uncorrectable structural failure. Mirror of `dbt build`.

## Usage

```bash
converge build --select <expression> [options]
```

Takes the same selection DSL as `run` (§4 of the design doc). Without `--select`, builds the full playbook.

## Options

### Build-mode flags

| Flag | Default | Effect |
|---|---|---|
| `--select`, `-s` | (all) | Selection expression (§4). |
| `--exclude`, `-e` |: | Subtractive expression. |
| `--selector` |: | Shortcut for `--select selector:NAME`. |
| `--fail-fast` | `true` | Stop on first uncorrectable failure. Default for `build`; opt-in for `run`. |
| `--full-refresh` | off | Force non-incremental execution; rebuild from scratch. |
| `--defer` | off | Use prior outputs from `--state` instead of re-running upstream tasks. |
| `--state=PATH` |: | Path to a prior `target/` for `state:` comparisons. |

### Common flags

| Flag | Default | Effect |
|---|---|---|
| `--playbook=NAME` | (auto-detect) | Which playbook to build. |
| `--vars='{k: v}'` |: | Override playbook `vars`. |
| `--threads=N` |: | Parallelism cap. |
| `--project-dir=PATH` | cwd | Project directory. |
| `--verbose`, `-v` | off | Verbose output. |

## Examples

```bash
# Build the entire playbook.
converge build

# Build a phase and everything downstream, stopping on first failure.
converge build --select '@phase:render'

# Build only what changed since last good run, deferring unchanged upstream.
converge build --select 'state:modified+' --defer --state /tmp/last-good

# Full rebuild (ignore incremental materializations).
converge build --full-refresh

# Build only failed tasks and their downstream dependents.
converge build --select 'result:error+'
```

## When to use

- **CI/CD or post-edit rebuild.** The "verify everything is green" verb. Use after structural edits.
- **First build of a playbook.** Equivalent to `run` but with fail-fast semantics.
- **Selective rebuild after editing a few tasks.** `--select state:modified+` rebuilds only what changed and what depends on it.
- **Prefer `run`** when you want the full loop (retries, self-repair) and don't need fail-fast.
