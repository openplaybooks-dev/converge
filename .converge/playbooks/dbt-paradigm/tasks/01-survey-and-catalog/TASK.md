---
title: Survey current WBS usages, repeated checks, and playbook catalog
description: |
  Catalog every wbs/ directory, every wbs: frontmatter usage, and every
  repeated inline check across live playbooks. Produce three artifacts
  that phases 02 and 03 consume. No code changes.

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
    cmd: test -s .converge/playbooks/dbt-paradigm/contract-probe-report.md
    description: Contract probe report exists.
  - id: wbs-inventory-exists
    cmd: test -s .converge/playbooks/dbt-paradigm/wbs-inventory.md
    description: WBS inventory catalogued.
  - id: checks-inventory-exists
    cmd: test -s .converge/playbooks/dbt-paradigm/checks-inventory.md
    description: Repeated checks catalogued.
  - id: catalog-valid-json
    cmd: jq -e 'type == "array"' .converge/playbooks/dbt-paradigm/playbooks-catalog.json
    description: Playbook catalog is a JSON array.
  - id: baseline-tests-green
    cmd: test -f .converge/playbooks/dbt-paradigm/wbs-inventory.md && pnpm -r test
    description: Baseline test suite green before any changes.

skills: []
references:
  - "@.converge/playbook-chain.md"

vars: {}
dependencies: []
---

# 01 — Survey and catalog

Three artifacts, no code changes.

## Step 0 — Contract probe

The `00-contract-probe/` sub-task runs first. If any probe fails, fix the
affected downstream contract before continuing.

## Step 1 — WBS inventory

Write `wbs-inventory.md`. For every `wbs/` directory in `.converge/playbooks/`
and `examples/`:

```
find .converge/playbooks/ examples/ -type d -name wbs
```

For each: playbook name, task path, script files (index.js / wbs.js),
template directories, line count. Also find every TASK.md with `wbs:`
frontmatter:

```
grep -rl '^wbs:' .converge/playbooks/ examples/
```

This inventory is the checklist for phase 02's migration.

## Step 2 — Checks inventory

Write `checks-inventory.md`. For every live playbook, find checks whose
`cmd` appears in ≥2 tasks:

```
# Pseudo: group checks by normalized cmd, report those with count ≥ 2
```

For each repeated check: playbook path, task IDs, check cmd (normalized),
parameterizable parts (file paths, timeouts, etc.). This is the checklist
for phase 03's migration.

## Step 3 — Playbook catalog

Write `playbooks-catalog.json`. A JSON array, one entry per playbook under
`.converge/playbooks/` and `examples/` that has a `playbook.yml`:

```json
[{
  "id": "cli-redesign",
  "path": ".converge/playbooks/cli-redesign",
  "live": true,
  "wbs_parents": ["tasks/03-execution-verbs"],
  "repeated_checks": ["pnpm typecheck"],
  "notes": ""
}]
```

Fields: `id`, `path`, `live` (true unless archived), `wbs_parents` (tasks
with wbs:), `repeated_checks` (from step 2), `notes`.

## Done when

All 5 checks pass. Phase 02 can read the WBS inventory and know exactly
what to rename. Phase 03 can read the checks inventory and know exactly
what to extract.
