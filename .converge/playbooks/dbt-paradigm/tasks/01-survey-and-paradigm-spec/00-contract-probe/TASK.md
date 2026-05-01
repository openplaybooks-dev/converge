---
title: Probe cli-redesign and remove-goals contracts behaviorally; surface drift before phase 02
description: |
  File-existence checks (the parent's predecessor checks) only catch
  outright deletion. This sub-task runs behavioral probes against the
  predecessor surfaces this playbook's later phases assume. If any
  probe fails, the predecessor's contract drifted during implementation
  and the affected dbt-paradigm phase 02+ TASK.md needs to be revised
  before proceeding.

inputs:
  - .converge/playbook-chain.md
  - packages/core/src/select
  - packages/core/src/manifest
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/runtime/runtime.ts
  - packages/cli/tests/fixtures/minimal-playbook
  - docs/design/cli-redesign.md

outputs:
  - .converge/playbooks/dbt-paradigm/contract-probe-report.md

checks:
  - id: predecessor-cli-redesign-merged
    cmd: test -d packages/core/src/select
    description: cli-redesign select module exists.
  - id: predecessor-remove-goals-merged
    cmd: "! test -f packages/core/src/runtime/goal-manager.ts"
    description: remove-goals deleted goal-manager.
  - id: probe-manifest-has-state-field
    cmd: |
      node packages/cli/dist/index.js compile --playbook=cli-redesign 2>/dev/null \
        || node packages/cli/dist/index.js compile 2>/dev/null
      f=$(find . -path '*/target/manifest.json' 2>/dev/null | head -1)
      test -n "$f" && jq -e '.nodes | to_entries[0].value.state' "$f" >/dev/null
    description: Compiled manifest carries a top-level `nodes` map and each node has a `state` field. Phase 03 of dbt-paradigm extends this same manifest with a `libraries:` section.
  - id: probe-frontier-selector-works
    cmd: node packages/cli/dist/index.js list --select 'frontier:' --help 2>/dev/null | grep -q frontier
    description: The `frontier:` selector method is registered. Phase 03 of dbt-paradigm extends the select grammar with `seed:` and `test:` alongside this one.
  - id: probe-compile-seed-exists
    cmd: node packages/cli/dist/index.js compile --help 2>&1 | grep -q -- '--seed'
    description: `compile --seed` exists. Phase 03 of dbt-paradigm reuses this verb for spawning seeds.
  - id: probe-no-goals-frontmatter-field
    cmd: "! grep -nE '^[[:space:]]*(goals|goalDefs|goal-defs):' packages/core/src/config/task-md-definition.ts"
    description: task-md schema has no goals/goalDefs/goal-defs frontmatter fields. Phase 02 of dbt-paradigm widens the same `checks:` field; conflicting goal logic must not have been re-added.
  - id: probe-fixture-playbook-loads
    cmd: |
      test -d packages/cli/tests/fixtures/minimal-playbook \
        && test -f packages/cli/tests/fixtures/minimal-playbook/playbook.yml
    description: cli-redesign's minimal-playbook fixture exists. Phase 02 of dbt-paradigm extends it with seeds/ and tests/.
  - id: probe-migration-table-no-goals-row
    cmd: "! grep -nE '^\\| `converge goals`' docs/design/cli-redesign.md"
    description: The `converge goals` row in the migration table is absent (remove-goals removed it). Phase 06 of dbt-paradigm adds a `seed →` follow-up note to the same table.
  - id: report-present
    cmd: test -s .converge/playbooks/dbt-paradigm/contract-probe-report.md
    description: A pass/fail report per probe is committed.

skills: []
references:
  - "@.converge/playbook-chain.md"

vars: {}
dependencies: []
---

# 00 — Contract probe (dbt-paradigm)

This is the first leaf of phase 01. Phase 01's other artifacts (design
doc, REFS.md, migration catalog) are written *after* this leaf passes,
because their content depends on the actual state of the predecessor
surfaces.

## What this checks

`.converge/playbook-chain.md` enumerates the surfaces this playbook
reads from cli-redesign and remove-goals. The eight checks above probe
each surface behaviorally — not just file-existence.

## What to do if a probe fails

A failed probe means a predecessor's contract changed during
implementation. The downstream contract in this playbook is now stale.
**Do not proceed to the rest of phase 01 until the affected TASK.md
files are updated.**

For each failed probe:

1. Open `.converge/playbook-chain.md` and find the matching row in the
   "Per-edge contract" section.
2. Find which dbt-paradigm phase reads that surface (the row names it).
3. Read the actual current state of the surface (run the probe by
   hand, inspect the output).
4. Update the affected phase's TASK.md to match the new contract.
5. Re-run the probe. Iterate until green.

## What to do when all probes pass

Write `.converge/playbooks/dbt-paradigm/contract-probe-report.md` with
one section per probe: probe name, what it asserts, observed value, and
"PASS" or "PASS (with note: ...)". This report is committed and read by
the rest of phase 01 to confirm the baseline.

After the report exists, phase 01's other leaves (`docs/design/dbt-
paradigm.md`, `REFS.md`, `playbooks-catalog.json`) proceed.

## Out of scope

- Updating downstream contracts is *not* this leaf's job — this leaf
  detects drift, the human (or per-layer planner) updates contracts.
- Running the full predecessor checks for the *third* downstream
  (declarative-discovery) — that's its own contract probe.

## Done when

All nine checks pass and the report file is committed.
