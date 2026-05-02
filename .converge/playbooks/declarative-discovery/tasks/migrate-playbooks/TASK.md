---
id: migrate-playbooks
title: "Add children: declarations to every parent TASK.md across every live playbook; verify parity"
description: |
  Per-playbook fan-out. For each live entry in the catalog: walk the
  existing folder structure, infer parent-child edges, write children:
  declarations into every parent's TASK.md, and verify the migrated
  playbook produces the same DAG under both loaders. After this phase,
  every live playbook is declarative — the prerequisite for deleting
  the tree abstractions in phase 06.

inputs:
  - .converge/playbooks/declarative-discovery/playbooks-catalog.json
  - .converge/playbooks/declarative-discovery/REFS.md
  - docs/design/declarative-discovery.md
  - packages/core/src/config/declarative-loader.ts
  - packages/core/src/config/path-registry.ts

outputs:
  - .converge/playbooks (modified TASK.md files)
  - .converge/playbooks/declarative-discovery/migration-report.md

checks:
  - id: typecheck-green
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck.
  - id: tests-green
    cmd: pnpm --filter @converge/core --filter @converge/cli test
    description: All tests pass.
  - id: every-parent-has-children-declaration
    cmd: |
      while IFS= read -r path; do
        parent_dirs=$(find "$path/tasks" -name TASK.md -mindepth 2 -exec dirname {} \; | xargs -I{} dirname {} | sort -u)
        for pd in $parent_dirs; do
          test -f "$pd/TASK.md" || continue
          if ! grep -qE '^children:|^from_seed:' "$pd/TASK.md"; then
            echo "Parent missing children: or from_seed: — $pd"
            exit 1
          fi
        done
      done < <(jq -r '.[] | select(.live == true) | .path' .converge/playbooks/declarative-discovery/playbooks-catalog.json)
    description: Every parent TASK.md in every live playbook declares its children.
  - id: migration-report-present
    cmd: test -s .converge/playbooks/declarative-discovery/migration-report.md
    description: Per-playbook migration report exists.

skills: []
references:
  - "docs/design/declarative-discovery.md"
  - ".converge/playbooks/declarative-discovery/playbooks-catalog.json"

vars: {}
dependencies:
  - dag-runner
children:
  - catalog-walk
  - per-playbook
  - verification
---

# 04 — Migrate every live playbook

Per-playbook fan-out. After this phase, every live playbook is
declarative — the prerequisite for deleting tree code in phase 06.

## Children

### 01-catalog-walk
Read `playbooks-catalog.json`. For each live playbook, walk its folder
structure and identify all parent directories (directories containing
TASK.md that have subdirectories with TASK.md). Output a per-playbook
migration plan.

### 02-per-playbook
One sub-task per catalog entry. For each parent in the playbook, add
`children:` listing its sub-directory task ids in alphanumeric order.
If the parent has seeding behavior (from dbt-paradigm), write
`from_seed:` instead. Verify parity after migration. Skip
`declarative-discovery` itself.

### 03-verification
Sweep all live playbooks. Assert every parent declares children: or
from_seed:. Generate migration-report.md with per-playbook results.

## Self-host safety

The `declarative-discovery` playbook itself is excluded from migration.
We don't migrate the playbook that's running.

## Done when

All checks pass. Every live playbook has every parent declaring its
children. Cross-loader parity passes for all.
