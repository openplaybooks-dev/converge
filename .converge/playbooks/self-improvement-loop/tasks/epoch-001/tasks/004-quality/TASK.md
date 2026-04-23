---
id: 004-quality
title: Quality gate — epoch 1
checks:
  - id: typecheck
    description: Zero type errors
    cmd: "cd /Users/minh/Documents/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: tests
    description: Tests pass
    cmd: "cd /Users/minh/Documents/converge && pnpm test 2>&1 | tail -1"
vars:
  taskId: 004-quality
  epoch: 1
  projectDir: /Users/minh/Documents/converge
  artifactsDir: /Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001
  epochTemplateDir: /Users/minh/Documents/converge/.converge/playbooks/improve/tasks/001-improve/templates/epoch
---

# Quality gate

Verify no regressions were introduced in this epoch.

## Steps

1. Run `pnpm typecheck` — must pass with zero errors
2. Run `pnpm test` — all tests must pass
3. If either fails, fix the issues
