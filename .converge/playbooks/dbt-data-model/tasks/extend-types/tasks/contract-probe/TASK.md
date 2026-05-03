---
id: contract-probe
title: Contract probe — verify declarative-discovery predecessor surfaces
description: |
  Verify that declarative-discovery is fully merged and its surfaces match
  what this playbook assumes. TaskDag, dag-runner, Manifest/RunResults types
  must exist. task/tree/ must be deleted. Fails fast if predecessor contract
  is broken.

inputs:
  - .converge/playbook-chain.md
  - packages/core/src/dag
  - packages/core/src/manifest

outputs:
  - .converge/playbooks/dbt-data-model/contract-probe-report.md

checks:
  - id: probe-report-exists
    cmd: test -s .converge/playbooks/dbt-data-model/contract-probe-report.md
    description: Contract probe report exists.

skills: []
references:
  - ".converge/playbook-chain.md"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 00 — Contract probe

Verify that declarative-discovery is merged and its surfaces match
what this playbook's later phases assume.

## Children

### red
Write probe scripts. Each checks one surface. Expected RED because some
surfaces may not exist yet or the predecessor may not be fully merged.

### green
Run all probes. Produce `contract-probe-report.md` with PASS/FAIL per probe.
All must pass before proceeding.

## Probe checklist

1. TaskDag exists: `packages/core/src/dag/task-dag.ts`
2. DagNode exists: `packages/core/src/dag/dag-node.ts`
3. dag-runner exists: `packages/core/src/dag/dag-runner.ts`
4. topological-sort exists: `packages/core/src/dag/topological-sort.ts`
5. declarative-loader exists: `packages/core/src/config/declarative-loader.ts`
6. Manifest types exist: `packages/core/src/manifest/types.ts`
7. Manifest has RunResult, RunResults, Manifest types
8. task/tree/ directory does NOT exist
9. No discoverChildren or walkTasksDirectory symbols
10. atomic-write.ts exists: `packages/core/src/checkpoint/atomic-write.ts`

Note: Probe #8 (zero TaskTree imports) was REMOVED — the `TaskTree` class
still lives in `dag/dag-tree.ts` and is exported from `dag/index.ts`. Removing
it is this playbook's job (phase 5 delete-checkpoint), not the predecessor's.
The playbook-level gate only requires `task/tree/` directory deleted.

## Done when

All probes pass and report is written.
