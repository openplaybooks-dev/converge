---
id: dynamic-spawn
title: Dynamic spawn — materialize virtual nodes when parent completes
description: |
  When a parent task with from_seed: completes, the child-synthesizer
  (from dbt-paradigm) runs and produces concrete child tasks. These
  replace the virtual nodes in the DAG. Handle multi-generation
  spawning (grandchildren) and path overrides from seed entries.

inputs:
  - packages/core/src/dag/dag-runner.ts
  - packages/core/src/runtime/child-synthesizer.ts
  - packages/core/src/runtime/seed-spawner.ts

outputs:
  - packages/core/src/dag/dag-runner.ts
  - packages/core/tests/dag/dag-runner-spawn.test.ts

checks:
  - id: spawn-tests-pass
    cmd: pnpm --filter @converge core test -- dag-runner-spawn
    description: Dynamic spawn tests pass.
  - id: typecheck-green
    cmd: pnpm --filter @converge core typecheck
    description: Core typechecks.

skills: []
references:
  - "packages/core/src/runtime/child-synthesizer.ts"

vars: {}
dependencies: []
children:
  - dynamic-spawn-red
  - dynamic-spawn-green
---

# 02 — Dynamic spawn

Virtual nodes (`.virtual: true`) from `from_seed:` become concrete
when their parent completes. The child-synthesizer is the integration
point.

## Children

### red
Write tests for dynamic spawn: parent with from_seed completes →
virtual child materializes → child executes in next layer.
Multi-generation spawning. Path override from seed entry.

### green
Implement spawn logic in executeDag. After a node completes, check
for from_seed, run child-synthesizer, replace virtual nodes.

## Done when

Spawn tests pass. Virtual nodes materialize at runtime.
