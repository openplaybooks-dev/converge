---
id: "{{taskId}}"
title: "Verify implementation — {{title}}"
checks:
  - id: typecheck
    cmd: "cd {{projectDir}} && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
    description: "Zero type errors"
  - id: tests
    cmd: "cd {{projectDir}} && pnpm test 2>&1 | tail -1"
    description: "Tests pass"
---

# Verify implementation — {{title}}

Quick verification that the PR's implementation doesn't break the build or tests.

## Steps

1. `cd {{projectDir}} && pnpm typecheck` — fix any type errors introduced by this PR.
2. `cd {{projectDir}} && pnpm test` — fix any test failures introduced by this PR.
3. If fixes are needed, apply them directly. Don't just report — converge.
