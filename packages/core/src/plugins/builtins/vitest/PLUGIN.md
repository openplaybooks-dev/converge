---
name: vitest
version: 1.0.0
description: Vitest test runner
---

# vitest

Registers a `test` check that runs Vitest. When the `typescript` plugin
is loaded, the `coding` task type is extended with the `test` check.

## Checks

- **test** — Runs `npx vitest run`.

## Conditional Behavior

If the `typescript` plugin is loaded, extends `coding` task type with `['test']`.
