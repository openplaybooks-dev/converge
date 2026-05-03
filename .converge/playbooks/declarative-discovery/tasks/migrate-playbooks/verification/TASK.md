---
id: verification
title: Verification sweep — every live playbook is declarative; generate migration-report.md
description: |
  Run a full sweep across all live playbooks. Assert every parent
  declares children: or from_seed:. Generate the final migration report.

inputs:
  - .converge/playbooks/declarative-discovery/playbooks-catalog.json
outputs:
  - .converge/playbooks/declarative-discovery/migration-report.md

checks:
  - id: migration-report-present
    cmd: test -s .converge/playbooks/declarative-discovery/migration-report.md
    description: Migration report exists.
  - id: every-parent-declarative
    cmd: |
      while IFS= read -r path; do
        parent_dirs=$(find "$path/tasks" -name TASK.md -mindepth 2 -exec dirname {} \; | xargs -I{} dirname {} | sort -u)
        for pd in $parent_dirs; do
          test -f "$pd/TASK.md" || continue
          grep -qE '^children:|^from_seed:' "$pd/TASK.md" || { echo "FAIL: $pd"; exit 1; }
        done
      done < <(jq -r '.[] | select(.live == true) | .path' .converge/playbooks/declarative-discovery/playbooks-catalog.json)
    description: Every live playbook parent is declarative.

skills: []
references: []

vars: {}
dependencies: []
children:
  - verification-red
  - verification-green
---

# 03 — Verification sweep

## Children

### red
Write the sweep script. Run it. Expected RED — not all playbooks
have been migrated yet.

### green
Run the sweep. Fix any remaining playbooks missing declarations.
Generate `migration-report.md`. All checks pass.

## Done when

Every parent in every live playbook declares its children.
Migration report written.
