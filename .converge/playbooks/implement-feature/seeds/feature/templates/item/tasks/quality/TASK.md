---
id: "{{taskId}}"
title: "Quality gate — {{task}}"
checks:
  - id: typecheck
    cmd: "cd {{projectDir}} && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
    description: "Zero type errors"
  - id: tests
    cmd: "cd {{projectDir}} && pnpm test 2>&1 | tail -1"
    description: "Tests pass"
---

# Quality gate

Final verification that the codebase is healthy after changes.

## Steps

1. Run `cd {{projectDir}} && pnpm typecheck` — must pass with zero errors
2. Run `cd {{projectDir}} && pnpm test` — all tests must pass
3. If either fails, fix the issues directly
