---
id: contract-probe
title: Contract probe — verify predecessor surfaces match what downstream phases assume
description: |
  Behavioral probe against cli-redesign, remove-goals, and dbt-paradigm
  merged surfaces. Verifies that child-synthesizer, seed-spawner, seed/test
  schemas, manifest shape, and WBS absence all hold before any DAG code
  is written. Fails fast if a predecessor contract is broken.

inputs:
  - .converge/playbook-chain.md
  - packages/core/src/select
  - packages/core/src/manifest
  - packages/core/src/runtime/child-synthesizer.ts
  - packages/core/src/runtime/seed-spawner.ts
  - packages/core/src/config/seed-md-definition.ts
  - packages/core/src/config/test-md-definition.ts
outputs:
  - .converge/playbooks/declarative-discovery/contract-probe-report.md

checks:
  - id: probe-report-exists
    cmd: test -s .converge/playbooks/declarative-discovery/contract-probe-report.md
    description: Contract probe report exists.

skills: []
references:
  - ".converge/playbook-chain.md"

vars: {}
dependencies: []
children:
  - contract-probe-red
  - contract-probe-green
---

# 00 — Contract probe

Verify that all predecessor playbooks have been merged and their
surfaces match what this playbook's later phases assume. If any probe
fails, this playbook cannot proceed — the predecessor surface drifted.

## Children

### red
Write probe scripts as standalone bash scripts under
`00-contract-probe/probes/`. Each probe checks one specific surface
(file existence, export shape, absence of deleted files). The
aggregate runner exits non-zero if any probe fails. Expected RED
because some dbt-paradigm outputs don't exist on disk yet.

### green
Run all probes. Produce `contract-probe-report.md` with PASS/FAIL per
probe. If all pass, phase 01 proceeds. If any fail, document the drift
and STOP — do not continue until predecessor contracts are fixed.

## Probe checklist (from playbook-chain.md)

1. `cli-redesign`: `packages/core/src/select/` exists
2. `remove-goals`: `goal-manager.ts` is absent
3. `dbt-paradigm`: `child-synthesizer.ts` exists and exports `synthesize`
4. `dbt-paradigm`: `seed-spawner.ts` exists and exports `spawnDynamicChildren`
5. `dbt-paradigm`: `seed-md-definition.ts` exists with expected exports
6. `dbt-paradigm`: `test-md-definition.ts` exists with expected exports
7. `dbt-paradigm`: `wbs-executor.ts` does NOT exist
8. `dbt-paradigm`: `wbs-target-utils.ts` does NOT exist
9. `dbt-paradigm`: No `wbs:` field in `task-md-definition.ts`
10. Manifest: `parent_map` and `child_map` in manifest types
11. Manifest: `libraries` section has `seeds` and `tests`
12. Fixture: `minimal-playbook` has `seeds/` and `tests/` directories
13. Select: `seed:` and `test:` selector methods are registered

## Done when

All 13 probes pass and `contract-probe-report.md` is written.
