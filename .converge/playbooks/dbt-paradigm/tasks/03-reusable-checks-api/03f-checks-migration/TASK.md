---
title: Extract repeated inline checks into tests/ library
description: |
  Use the checks inventory from phase 01. For each repeated check, create
  a tests/<name>.test.md file and replace inline occurrences with
  test:<name>(args) references.

inputs:
  - .converge/playbooks/dbt-paradigm/checks-inventory.md
  - .converge/playbooks/dbt-paradigm/playbooks-catalog.json

outputs:
  - .converge/playbooks
  - examples
  - .converge/playbooks/dbt-paradigm/checks-migration-report.md

checks:
  - id: every-playbook-compiles
    cmd: |
      test -f .converge/playbooks/dbt-paradigm/checks-migration-report.md && while IFS= read -r path; do
        node packages/cli/dist/index.js compile --dir "$path" || exit 1
      done < <(jq -r '.[] | select(.live == true) | .path' .converge/playbooks/dbt-paradigm/playbooks-catalog.json)
    description: Every live playbook compiles.
  - id: checks-migration-report-exists
    cmd: test -s .converge/playbooks/dbt-paradigm/checks-migration-report.md
    description: Migration report written.
  - id: typecheck-green
    cmd: test -f .converge/playbooks/dbt-paradigm/checks-migration-report.md && pnpm -r typecheck
    description: Repo typechecks.
  - id: tests-green
    cmd: test -f .converge/playbooks/dbt-paradigm/checks-migration-report.md && pnpm -r test
    description: All tests pass.

skills: []
references:
  - ".converge/playbooks/dbt-paradigm/checks-inventory.md"

vars: {}
dependencies:
  - 03e-test-selectors
---

# 03f — Checks migration

## Per repeated check (from phase 01 inventory)

1. Create `tests/<name>.test.md` with the check command, parameterizing
   any varying parts as `args`.
2. Replace inline `checks:` entries with `test:<name>(args)` in every
   task that used it.
3. Verify `converge compile --dir <path>` exits 0.
4. Verify `converge test --select '<task>' --dir <path>` passes.

## Per playbook

- Compile baseline before migration → GREEN.
- Extract checks one by one, verifying compile stays GREEN after each.
- Record in `checks-migration-report.md`: playbook id, check name, tasks
  migrated, before/after check count.

## Self-host safety

Skip `dbt-paradigm` itself. Predecessor playbooks ARE migrated.

## Done when

All 4 checks pass. Checks inventory is cleared — every repeated check
is now a test reference.
