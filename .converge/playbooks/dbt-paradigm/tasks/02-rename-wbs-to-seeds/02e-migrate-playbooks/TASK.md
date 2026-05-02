---
title: Apply rename migration to every live playbook
description: |
  Walk every live playbook from the phase 01 catalog. Apply steps 02b
  (move scripts to seeds/) and 02c (convert wbs: to seeds:) to each.
  Verify each compiles and tests pass. This task is the batch execution
  of the patterns developed in 02b-02c.

inputs:
  - .converge/playbooks/dbt-paradigm/wbs-inventory.md
  - .converge/playbooks/dbt-paradigm/playbooks-catalog.json

outputs:
  - .converge/playbooks
  - examples
  - .converge/playbooks/dbt-paradigm/migration-report.md

checks:
  - id: no-wbs-anywhere
    cmd: |
      test -z "$(grep -rlE '^wbs:' .converge/playbooks/ examples/ 2>/dev/null)" && test -z "$(find .converge/playbooks/ examples/ -type d -name wbs 2>/dev/null)"
    description: "Zero wbs frontmatter and zero wbs directories anywhere."
  - id: every-playbook-compiles
    cmd: |
      test -f .converge/playbooks/dbt-paradigm/migration-report.md && while IFS= read -r path; do
        node packages/cli/dist/index.js compile --dir "$path" || exit 1
      done < <(jq -r '.[] | select(.live == true) | .path' .converge/playbooks/dbt-paradigm/playbooks-catalog.json)
    description: Every live playbook compiles.
  - id: migration-report-exists
    cmd: test -s .converge/playbooks/dbt-paradigm/migration-report.md
    description: Migration report written.
  - id: typecheck-green
    cmd: test -f .converge/playbooks/dbt-paradigm/migration-report.md && pnpm -r typecheck
    description: Repo typechecks.
  - id: tests-green
    cmd: test -f .converge/playbooks/dbt-paradigm/migration-report.md && pnpm -r test
    description: All tests pass.

skills: []
references:
  - ".converge/playbooks/dbt-paradigm/wbs-inventory.md"

vars: {}
dependencies:
  - 02d-update-cli-and-compile
---

# 02e — Migrate all live playbooks

Apply the rename patterns from 02b-02c to every live playbook in the
phase 01 catalog. Exclude `dbt-paradigm` itself.

## Per-playbook procedure

For each live entry in `playbooks-catalog.json` where `id !== "dbt-paradigm"`:

1. **Smoke test** — `converge compile --dir <path>` exits 0 before migration.
2. **Move scripts** — for each `wbs/` directory listed in the inventory:
   - Pick a unique seed name.
   - `git mv wbs/index.js seeds/<name>.seed.js` (or `wbs.js` → `<name>.seed.js`).
   - Move `wbs/templates/` → `seeds/<name>/templates/`.
   - Update template-ref paths in the script.
3. **Convert frontmatter** — for each TASK.md with `wbs:`:
   - Replace `wbs:` block with `seeds: [<name>]`.
4. **Verify** — `converge compile --dir <path>` exits 0.
5. **Record** — append to `migration-report.md`: playbook id, seeds created,
   tasks updated, before/after compile status.

## Self-host safety

Skip `dbt-paradigm` itself (filter `entry.id !== "dbt-paradigm"`).
Predecessor playbooks (`cli-redesign`, `remove-goals`) ARE migrated.

## Done when

All 5 checks pass. Every live playbook uses `seeds:` and has a `seeds/`
directory. Zero references to `wbs:` or `wbs/` remain.
