---
id: commands-run
title: commands-run.ts — replace iteration loop with executeDag()
description: |
  The primary execution path. Currently uses TaskTree.load() + an
  iteration loop (find next task, execute, checkpoint, repeat). Replace
  with buildDagFromPlaybook() + executeDag() — single topological pass.

inputs:
  - packages/cli/src/commands-run.ts
  - packages/core/src/dag/dag-runner.ts
  - packages/core/src/config/declarative-loader.ts

outputs:
  - packages/cli/src/commands-run.ts (modified)
  - packages/cli/tests/commands-run.test.ts (added)

checks:
  - id: tests-pass
    cmd: pnpm --filter @converge cli test -- commands-run
    description: Commands-run tests pass.
  - id: typecheck-green
    cmd: pnpm --filter @converge cli typecheck
    description: CLI typechecks.

skills: []
references: []
dependencies: []
children:
  - commands-run-red
  - commands-run-green
---

# 01 — commands-run.ts

## Current state
`TaskTree.load()` → find next task → execute → checkpoint → repeat
(iteration loop). This is the core execution engine.

## Target state
`buildDagFromPlaybook()` → `executeDag()` — single pass. Each node
executes once in topological order.

## Children

### red
Write a test that captures the current run command behavior. Run a
small playbook, assert tasks complete in order, assert exit code.
Capture regression baseline.

### green
Add DAG code path to commands-run.ts. When the playbook has children:
declarations (all playbooks after phase 04), use executeDag().
Otherwise fall back to the tree path. The baseline test must pass.

## Done when
Run command uses executeDag for declarative playbooks. Baseline test
green.
