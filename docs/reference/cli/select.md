---
title: "Selection"
description: "Current selection flags and the shipped selector mental model."
sidebar:
  order: 23
---

Converge's built CLI exposes `--select`, `--exclude`, and `--selector`.

The current help describes selection by:

- task ID
- tag
- status
- graph operator

The implementation also contains state- and frontier-aware selection logic. Treat this page as the current shipped surface, not as a full redesign spec.

## Where selection is used

- `converge run`
- `converge list`
- `converge clean`
- `converge test`

## Common examples

These patterns are referenced by the built help and runtime:

```bash
converge run --select=03-implement
converge list --exclude 'status:complete'
converge list --select 'state:modified+' --state /tmp/last-good
```

## Important caveat

Older docs described a complete dbt-style selection redesign plus `compile --seed`. That proposal is not the canonical source for current CLI behavior.

If you are trying to understand what a specific command accepts today:

```bash
converge run --help
converge list --help
```

Those command help screens should win over older redesign prose.
