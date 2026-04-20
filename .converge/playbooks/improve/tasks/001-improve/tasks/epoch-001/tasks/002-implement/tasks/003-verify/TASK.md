---
id: 003-verify
title: Verify implementation — epoch 1
checks:
  - id: typecheck
    description: Zero type errors
    cmd: "cd /Users/minh/Documents/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: tests
    description: Tests pass
    cmd: "cd /Users/minh/Documents/converge && pnpm test 2>&1 | tail -1"
vars:
  taskId: 003-verify
  epoch: 1
  projectDir: /Users/minh/Documents/converge
  artifactsDir: /Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001
  epochTemplateDir: /Users/minh/Documents/converge/.converge/playbooks/improve/tasks/001-improve/templates/epoch
---

# Verify implementation

Run typecheck and tests to confirm the todos didn't introduce regressions.

## Steps

1. Run `pnpm typecheck` — must pass with zero errors
2. Run `pnpm test` — all tests must pass
3. If either fails, fix the issues
