---
title: Add reusable checks API — test library with shell/JS scripts
description: |
  Add a tests/ library at the playbook level. A .test.md file defines a
  reusable check (shell command or JS script with context API). Tasks
  reference tests via test:<name>(args) in their checks: array. The
  loader expands references to inline checks at parse time.

  Six children. Uses the checks inventory from phase 01.

inputs:
  - .converge/playbooks/dbt-paradigm/checks-inventory.md
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/skill-definition.ts
  - packages/core/src/task/discovery/scanner.ts
  - packages/core/src/select/resolver.ts

outputs:
  - packages/core/src/config/test-md-definition.ts
  - packages/core/src/config/test-expander.ts
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/task/discovery/scanner.ts
  - packages/core/src/select/resolver.ts
  - .converge/playbooks

checks:
  - id: typecheck-green
    cmd: test -f packages/core/src/config/test-md-definition.ts && pnpm -r typecheck
    description: Repo typechecks.
  - id: tests-green
    cmd: test -f packages/core/src/config/test-md-definition.ts && pnpm -r test
    description: All tests pass.
  - id: test-md-definition-exists
    cmd: test -s packages/core/src/config/test-md-definition.ts
    description: Test schema module exists.
  - id: test-expander-exists
    cmd: test -s packages/core/src/config/test-expander.ts
    description: Test expander exists.
  - id: test-selector-works
    cmd: test -f packages/core/src/config/test-md-definition.ts && pnpm --filter @converge/core test -- test-selector
    description: test:<name> selector works.
  - id: no-duplicate-inline-checks
    cmd: test -s .converge/playbooks/dbt-paradigm/checks-inventory.md
    description: Checks inventory consulted for migration.

skills: []
references:
  - ".converge/playbooks/dbt-paradigm/checks-inventory.md"

vars: {}
dependencies:
  - 02-rename-wbs-to-seeds
---

# 03 — Reusable checks API

## Children

| id | goal |
|---|---|
| `03a-test-schema` | .test.md file format + parser (type: cmd and type: js) |
| `03b-check-union-and-ref-parser` | checks: becomes inline \| test-ref; parse test:<name>(args) |
| `03c-test-expander` | Resolve test refs to inline checks at load time |
| `03d-discovery-and-scripts` | Scanner discovers tests/; wire expander; shell+JS runner |
| `03e-test-selectors` | test:<name> selector method |
| `03f-checks-migration` | Extract repeated checks into tests/ per the inventory |

## Execution order

```
03a → 03b → 03c → 03d → 03e → 03f
```

## Done when

All 6 checks pass. Reusable checks are first-class on disk. Tasks reference
them via test:<name>(args).
