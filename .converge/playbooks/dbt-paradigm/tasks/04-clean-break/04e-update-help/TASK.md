---
title: Update CLI help text to show only dbt-model commands
description: |
  Rewrite help output to list compile, run, test, build, list, seed, clean,
  retry, status — and remove plan, verify, playbook, skills.

inputs:
  - packages/cli/src/main.ts
  - packages/cli/src/help.ts

outputs:
  - packages/cli/src/main.ts
  - packages/cli/src/help.ts

checks:
  - id: help-shows-dbt
    cmd: test -f packages/cli/src/help.ts && node packages/cli/dist/index.js help 2>&1 | grep -qE 'compile|test|build|seed|run'
    description: Help lists dbt-model commands.
  - id: no-legacy-in-help
    cmd: test -f packages/cli/src/help.ts && { node packages/cli/dist/index.js help 2>&1 | grep -qE 'plan|verify --fix|playbook|skills'; test $? -ne 0; }
    description: Help does not list legacy commands.
  - id: typecheck-green
    cmd: test -f packages/cli/src/main.ts && pnpm -r typecheck
    description: Repo typechecks.

skills: []
references:
  - "packages/cli/src/main.ts"

vars: {}
dependencies:
  - 04b-remove-dead-code
  - 04d-clean-exports
---

# 04e — Update help text

## New help structure

```
WORKFLOW
  init, compile, run, test, build, list, clean, retry, status

INSPECTION
  inspect, show (gantt|graph|journal|trend), metrics

MANAGEMENT
  debug, deps (list|install), seed
```

Remove: plan, playbook, skills, verify.
Remove `_removed_objectives` ghost entry from help.ts ~line 328.

## Done when

All 3 checks pass. `converge help` shows only dbt commands.
