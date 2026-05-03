---
id: contract-probe-red
title: Red — write probe scripts that verify predecessor surfaces
description: |
  Write standalone bash probe scripts. Each checks one predecessor surface.
  Aggregate runner exits non-zero if any probe fails. Expected RED because
  predecessor may not be fully merged.

inputs:
  - .converge/playbook-chain.md

outputs:
  - .converge/playbooks/dbt-data-model/00-contract-probe/probes/

checks:
  - id: probes-exist
    cmd: test -d .converge/playbooks/dbt-data-model/00-contract-probe/probes && test $(ls .converge/playbooks/dbt-data-model/00-contract-probe/probes/*.sh 2>/dev/null | wc -l) -ge 5
    description: At least 5 probe scripts exist.
  - id: probes-fail
    cmd: "! bash .converge/playbooks/dbt-data-model/00-contract-probe/run-all.sh 2>/dev/null"
    description: Probes fail (RED) — not all predecessor surfaces confirmed.

tags:
  - tdd
  - red
---

# Red — failing probe scripts

Write probe scripts under `00-contract-probe/probes/`. Each script checks
one predecessor surface. Create `run-all.sh` that runs all probes and
exits non-zero if any fail.

Expected RED because some predecessor surfaces may not be confirmed yet.

## Probes

1. `check-task-dag.sh` — `test -f packages/core/src/dag/task-dag.ts`
2. `check-dag-runner.sh` — `test -f packages/core/src/dag/dag-runner.ts`
3. `check-declarative-loader.sh` — `test -f packages/core/src/config/declarative-loader.ts`
4. `check-tree-deleted.sh` — `! test -d packages/core/src/task/tree`
5. `check-manifest-types.sh` — grep for RunResult, RunResults, Manifest in `packages/core/src/manifest/types.ts`
6. `check-atomic-write.sh` — `test -f packages/core/src/checkpoint/atomic-write.ts`

Note: Probe #6 (check-no-tasktree-imports.sh) from the original checklist was
removed — TaskTree imports still exist legitimately in dag/dag-tree.ts. Zeroing
them is dbt-data-model phase 5's job, not the predecessor's.
