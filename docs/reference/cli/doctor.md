---
title: "converge doctor"
description: "Run a one-shot health check for autonomous-run failure fingerprints."
sidebar:
  order: 19
---

`doctor` scans the workspace for known runtime failure fingerprints and exits non-zero if it finds any.

This is the first operator command to run when you want to know whether an autonomous run actually shipped real work or only looked successful.

## Usage

```bash
converge doctor --playbook <name> [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--playbook=NAME` | env | Required unless `CONVERGE_PLAYBOOK` is set. |
| `--json` | off | Emit machine-readable JSON. |
| `--fix` | off | Attempt safe auto-fixes where supported. |

## Findings

`doctor` currently looks for:

- definition gaps
- phantom work items
- contradictory sprint findings
- stale goal sentinels
- tripped repair circuits
- malformed `SKILL.md` files

## Examples

```bash
converge doctor --playbook default
converge doctor --playbook default --json
converge doctor --playbook default --fix
```

## What `--fix` can do

- remove stale goal sentinels
- reset tripped repair circuits
- touch rejected definition files so repair can retry on the next run

It does **not** delete forensic artifacts like `.rejected` files or evidence payloads.

