---
id: 01-survey-and-catalog
title: Survey current WBS usages, repeated checks, and playbook catalog
description: "Catalog every wbs/ directory, every wbs: frontmatter usage, and every\nrepeated inline check across live playbooks. Produce three artifacts\nthat phases 02 and 03 consume. No code changes.\n\n_Feedback: smoke test feedback from studio_"
inputs:
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/executor/seed-executor.ts
  - .converge/playbooks
  - examples
outputs:
  - .converge/playbooks/dbt-paradigm/wbs-inventory.md
  - .converge/playbooks/dbt-paradigm/checks-inventory.md
  - .converge/playbooks/dbt-paradigm/playbooks-catalog.json
  - .converge/playbooks/dbt-paradigm/contract-probe-report.md
checks:
  - id: contract-probe-passed
    type: cmd
    cmd: test -s .converge/playbooks/dbt-paradigm/contract-probe-report.md
    description: Contract probe report exists.
  - id: wbs-inventory-exists
    type: cmd
    cmd: test -s .converge/playbooks/dbt-paradigm/wbs-inventory.md
    description: WBS inventory catalogued.
  - id: checks-inventory-exists
    type: cmd
    cmd: test -s .converge/playbooks/dbt-paradigm/checks-inventory.md
    description: Repeated checks catalogued.
  - id: catalog-valid-json
    type: cmd
    cmd: "jq -e 'type == \"array\"' .converge/playbooks/dbt-paradigm/playbooks-catalog.json"
    description: Playbook catalog is a JSON array.
  - id: baseline-tests-green
    type: cmd
    cmd: test -f .converge/playbooks/dbt-paradigm/wbs-inventory.md && pnpm -r test
    description: Baseline test suite green before any changes.
  - id: feedback-mornl8hu
    type: cmd
    cmd: "# feedback: smoke test feedback from studio"
    description: "User comment: smoke test feedback from studio"
---
# Survey current WBS usages, repeated checks, and playbook catalog

Catalog every wbs/ directory, every wbs: frontmatter usage, and every
repeated inline check across live playbooks. Produce three artifacts
that phases 02 and 03 consume. No code changes.

_Feedback: smoke test feedback from studio_

## Inputs

- `packages/core/src/config/task-md-definition.ts`
- `packages/core/src/executor/seed-executor.ts`
- `.converge/playbooks`
- `examples`

## Outputs

- `.converge/playbooks/dbt-paradigm/wbs-inventory.md`
- `.converge/playbooks/dbt-paradigm/checks-inventory.md`
- `.converge/playbooks/dbt-paradigm/playbooks-catalog.json`
- `.converge/playbooks/dbt-paradigm/contract-probe-report.md`

## Checks

- **contract-probe-passed** (cmd): `test -s .converge/playbooks/dbt-paradigm/contract-probe-report.md` — Contract probe report exists.
- **wbs-inventory-exists** (cmd): `test -s .converge/playbooks/dbt-paradigm/wbs-inventory.md` — WBS inventory catalogued.
- **checks-inventory-exists** (cmd): `test -s .converge/playbooks/dbt-paradigm/checks-inventory.md` — Repeated checks catalogued.
- **catalog-valid-json** (cmd): `jq -e 'type == "array"' .converge/playbooks/dbt-paradigm/playbooks-catalog.json` — Playbook catalog is a JSON array.
- **baseline-tests-green** (cmd): `test -f .converge/playbooks/dbt-paradigm/wbs-inventory.md && pnpm -r test` — Baseline test suite green before any changes.
- **feedback-mornl8hu** (cmd): `# feedback: smoke test feedback from studio` — User comment: smoke test feedback from studio
