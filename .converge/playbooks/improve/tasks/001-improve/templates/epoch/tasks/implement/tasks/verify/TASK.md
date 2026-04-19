---
id: "{{taskId}}"
title: "Verify implementation — epoch {{epoch}}"
checks:
  - id: typecheck
    cmd: "cd {{projectDir}} && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
    description: "Zero type errors"
  - id: tests
    cmd: "cd {{projectDir}} && pnpm test 2>&1 | tail -1"
    description: "Tests pass"
---

# Verify implementation

Run typecheck and tests to confirm the todos didn't introduce regressions.

## Steps

1. Run `pnpm typecheck` — must pass with zero errors
2. Run `pnpm test` — all tests must pass
3. If either fails, fix the issues
