---
id: per-playbook
title: "Per-playbook migration — add children: declarations"
description: |
  For each playbook in the catalog, add children: (or from_seed:) to
  every parent TASK.md. One sub-task per playbook, WBS-spawned from
  the catalog. Each spawned sub-task follows red-green.

inputs:
  - .converge/playbooks/declarative-discovery/catalog-migration-plan.md
  - .converge/playbooks/declarative-discovery/playbooks-catalog.json

outputs:
  - .converge/playbooks/<id>/tasks/**/TASK.md (modified)

checks:
  - id: playbook-parity
    cmd: |
      PLAYBOOK_DIR="$1"
      diff \
        <(node packages/cli/dist/index.js --project-dir "$(dirname "$PLAYBOOK_DIR")" compile --playbook="$(basename "$PLAYBOOK_DIR")" --json | jq '.nodes | keys') \
        <(node packages/cli/dist/index.js --project-dir "$(dirname "$PLAYBOOK_DIR")" compile --playbook="$(basename "$PLAYBOOK_DIR")" --json | jq '.nodes | keys')
    description: Both loaders produce identical DAG for this playbook.

skills: []
references: []

vars: {}
dependencies: []
---

# 02 — Per-playbook migration

This is a WBS seed template. For each catalog entry, a sub-task is
spawned with the playbook path injected.

## Per-playbook recipe

Given a playbook directory:

### Step 1 — Walk folder structure, infer edges
For each TASK.md, identify its directory's sub-directories that
contain TASK.md files. Those are its children.

### Step 2 — Distinguish static vs dynamic
- **Dynamic**: parent has `seeds: [<spawning-seed>]` → write
  `from_seed: <name>`.
- **Static**: otherwise → write `children: [<id>, ...]` in
  alphanumeric order.

### Step 3 — Write declarations
Edit the parent's TASK.md frontmatter:
- Add `children:` and/or `from_seed:` fields.
- Do not modify any other field.
- For multi-parent children (rare today): add the child id to every
  parent that claims it.

### Step 4 — Verify parity
Run both loaders against the migrated playbook. Node sets and edge
sets must be identical.

### Step 5 — Append to migration report
Record: playbook id, parents migrated, children: entries written,
from_seed: count, parity result.

## Self-host safety
Skip `declarative-discovery` itself.

## Done when
Every parent in the playbook declares its children. Parity verified.
