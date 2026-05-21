---
title: "CLI"
description: "Reference for the built converge CLI."
sidebar:
  order: 0
---

This section should match the built CLI help, not earlier redesign proposals.

Top-level usage:

```bash
converge <command> [playbook] [options]
```

## Main command groups

### Execute

- `run`
- `retry`
- `stop`
- `add`
- `plan`

### Inspect

- `list` / `ls`
- `show`
- `inspect`
- `status`
- `verify`
- `metrics`
- `docs`

### Audit

- `doctor`
- `playbook validate`
- `playbook list`
- `playbook info`
- `playbook history`

### Infrastructure

- `init`
- `clean`
- `reset`
- `build`
- `compile`
- `test`
- `spawn`
- `render`
- `deps`

## Selection flags

The built CLI exposes:

- `--select, -s`
- `--exclude, -e`
- `--selector`
- `--state=PATH`
- `--defer`
- `--fail-fast`
- `--dry`
- `--step`

See [run](./run.md) and [select](./select.md) for the current behavior.

## Global options

- `--project-dir=PATH`
- `--playbook=NAME`
- `--json`
- `--verbose, -v`

## Notes

- `run` is still the primary execution verb.
- `build`, `compile`, and `test` exist as commands, but parts of the current help still describe them as compatibility surfaces around the main scheduler.
- The runtime is journal-backed. When docs mention `target/manifest.json`, they are describing proposal material, not the current CLI contract.
