---
title: Probe predecessor contracts — cli-redesign and remove-goals are merged
description: |
  Verify the upstream surfaces this playbook depends on match expectations.
  If a probe fails, update this playbook's contracts before proceeding.

inputs:
  - .converge/playbook-chain.md
  - packages/core/src/select
  - packages/core/src/config/task-md-definition.ts
  - docs/design/cli-redesign.md

outputs:
  - .converge/playbooks/dbt-paradigm/contract-probe-report.md

checks:
  - id: predecessor-cli-redesign-merged
    cmd: test -d packages/core/src/select
    description: cli-redesign select module exists.
  - id: predecessor-remove-goals-merged
    cmd: test -d packages/core/src/select && ! test -f packages/core/src/runtime/goal-manager.ts
    description: remove-goals deleted goal-manager.
  - id: probe-manifest-has-state-field
    cmd: |
      node packages/cli/dist/index.js compile --dir .converge/playbooks/cli-redesign 2>/dev/null
      f=$(find .converge/playbooks/cli-redesign -path '*/target/manifest.json' 2>/dev/null | head -1)
      test -n "$f" && jq -e '.nodes | to_entries[0].value.state' "$f" >/dev/null
    description: Compiled manifest carries state field per node.
  - id: probe-frontier-selector-registered
    cmd: |
      grep -q frontier packages/core/src/select/resolver.ts
    description: "frontier selector method exists in resolver."
  - id: probe-compile-seed-exists
    cmd: |
      grep -q 'seed' packages/cli/src/commands-compile.ts
    description: compile --seed flag exists.
  - id: probe-no-goals-frontmatter
    cmd: test -f packages/core/src/config/task-md-definition.ts && ! grep -nE '^[[:space:]]*(goals|goalDefs|goal-defs):' packages/core/src/config/task-md-definition.ts
    description: No goals fields in task-md schema.
  - id: probe-fixture-exists
    cmd: test -d packages/cli/tests/fixtures/minimal-playbook && test -f packages/cli/tests/fixtures/minimal-playbook/playbook.yml
    description: minimal-playbook fixture exists.
  - id: probe-no-converge-goals-in-migration-table
    cmd: test -f docs/design/cli-redesign.md && ! grep -nE '^\\| `converge goals`' docs/design/cli-redesign.md
    description: converg goals row removed from migration table.
  - id: report-present
    cmd: test -s .converge/playbooks/dbt-paradigm/contract-probe-report.md
    description: Probe report committed.

skills: []
references:
  - "@.converge/playbook-chain.md"

vars: {}
dependencies: []
---

# 00 — Contract probe

Verifies cli-redesign and remove-goals contracts hold. Write a pass/fail
report per probe to `contract-probe-report.md`. If any probe fails, update
the affected downstream TASK.md before proceeding.
