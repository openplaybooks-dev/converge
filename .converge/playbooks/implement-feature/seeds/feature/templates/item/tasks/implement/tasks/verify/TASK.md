---
id: "{{taskId}}"
title: "Verify implementation — {{task}}"
checks:
  - id: typecheck
    cmd: "cd {{projectDir}} && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
    description: "Zero type errors"
  - id: tests
    cmd: "cd {{projectDir}} && pnpm test 2>&1 | tail -1"
    description: "Tests pass"
---

# Verify implementation

Quick verification that the implementation doesn't break anything.

## Steps

1. Run `cd {{projectDir}} && pnpm typecheck` — fix any type errors introduced
2. Run `cd {{projectDir}} && pnpm test` — fix any test failures introduced
3. If fixes are needed, make them directly (don't just report)
