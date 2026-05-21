---
title: "converge run"
description: "Execute tasks via the convergence loop."
sidebar:
  order: 3
---

`converge run` is the primary execution verb.

Current built help describes it as:

- dispatching AI agents
- running checks
- retrying failures
- converging results

It auto-compiles the playbook into journal-backed runtime state before executing.

## Usage

```bash
converge run [filter] [options]
```

## Current options

- `--select, -s <expr>`
- `--exclude, -e <expr>`
- `--selector <name>`
- `--state=PATH`
- `--defer`
- `--fail-fast`
- `--resume`
- `--dry`
- `--step`
- `--max-duration=N`
- `--verbose, -v`

## Current mental model

- `converge compile` and `converge run --dry` are preview/validation-style entry points
- `converge run` executes against `.converge/journal/<playbook>/`
- `--resume` reuses the last execution state
- `--dry` prints the would-run preview without executing

## Related commands

The built help currently documents these relationships:

- `build` -> fail-fast execution
- `test` -> checks-only execution
- `retry` -> resume execution
- `compile` -> compile/preview behavior

## Journal artifacts

Look in:

```text
.converge/journal/<playbook>/
├── manifest.json
├── runstate.json
└── ...
```

These are the current compile/runtime artifacts used by the runner.
