---
id: "{{taskId}}"
title: "Quality gate — epoch {{epoch}}"
checks:
  - id: typecheck
    cmd: "cd {{projectDir}} && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
    description: "Zero type errors"
  - id: tests
    cmd: "cd {{projectDir}} && pnpm test 2>&1 | tail -1"
    description: "Tests pass"
---

# Quality gate

Verify no regressions were introduced in this epoch.

## Steps

1. Run `pnpm typecheck` — must pass with zero errors
2. Run `pnpm test` — all tests must pass
3. If either fails, fix the issues
