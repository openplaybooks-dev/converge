---
title: "converge plan"
description: "Reference for the top-level converge plan command."
sidebar:
  order: 12
---

`converge plan` appears in the top-level CLI help, but the current built binary does not expose a dedicated `converge plan --help` screen.

Treat this page as a lightweight orientation page, not a help-text mirror.

## Current role

Plan work before running it. In the current CLI surface, `plan` is the planning-oriented companion to `add` and `run`.

If you want a documented, built-help-backed path for creating a playbook today, use [`converge add`](./add.md), especially `--from-prompt` or `--from-example`.

## Examples

```bash
converge plan
converge add --from-prompt "Build a research playbook for model evals"
converge add --from-example hello-world
```

## Recommendation

For production-facing docs and automation, prefer command pages that match built help output directly. Today that means `add`, `run`, `list`, `init`, and the rest of the documented CLI pages are safer anchors than this command.
