---
id: executor
title: executeDag() — topological executor, no iterations, no waves
description: |
  Implement the core DAG runner. Single topological pass — compute order
  once, execute each layer, done. No iteration loop. No wave loop.

inputs:
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/topological-sort.ts
  - packages/core/src/dag/task-dag.ts

outputs:
  - packages/core/src/dag/dag-runner.ts
  - packages/core/tests/dag/dag-runner.test.ts

checks:
  - id: dag-runner-exists
    cmd: test -s packages/core/src/dag/dag-runner.ts
    description: Module exists.
  - id: tests-pass
    cmd: pnpm --filter @converge core test -- dag-runner
    description: DAG runner tests pass.
  - id: typecheck-green
    cmd: pnpm --filter @converge core typecheck
    description: Core typechecks.

skills: []
references:
  - "packages/core/src/dag/task-dag.ts"

vars: {}
dependencies: []
children:
  - executor-red
  - executor-green
---

# 01 — DAG runner

Core executor. Single pass through the topological order.

## Children

### red
Write unit tests for executeDag. Test: linear execution order, diamond
execution, failure blocking, checkpoint resume, single node, empty DAG.
Mock the task execution function to track call order.

### green
Implement `executeDag()`. Run tests green. Export from dag/index.ts.

## Done when

All tests pass. Typecheck green.
