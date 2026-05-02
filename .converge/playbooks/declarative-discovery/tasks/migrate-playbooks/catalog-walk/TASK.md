---
id: catalog-walk
title: Walk catalog — produce per-playbook migration plan
description: |
  Read playbooks-catalog.json. For each live entry, walk its folder
  structure, identify all parent-child edges, and produce a migration
  plan document listing what children: declarations to add where.
  Single leaf — no red/green needed for a planning step.

inputs:
  - .converge/playbooks/declarative-discovery/playbooks-catalog.json

outputs:
  - .converge/playbooks/declarative-discovery/catalog-migration-plan.md

checks:
  - id: migration-plan-exists
    cmd: test -s .converge/playbooks/declarative-discovery/catalog-migration-plan.md
    description: Migration plan exists.

skills: []
references:
  - ".converge/playbooks/declarative-discovery/playbooks-catalog.json"

vars: {}
dependencies: []
---

# 01 — Catalog walk

Produce a per-playbook migration plan.

## Algorithm

For each catalog entry where `live === true` and `id !== 'declarative-discovery'`:

1. List all directories under `<playbookDir>/tasks/` that contain a
   TASK.md.
2. For each such directory, check if it has subdirectories that
   contain TASK.md files. If yes, it's a parent — its subdirectories
   are its children.
3. For each child, record: parent id, child id, child path (relative).

## Output format

```markdown
# Per-playbook migration plan

## cli-redesign
| Parent | Children |
|--------|----------|
| 01-foundations | 01-select-parser, 02-manifest-rw, 03-task-hashes |
| 01-select-parser | 01-red, 02-green |
| ... | ... |

## dbt-paradigm
| Parent | Children |
|--------|----------|
| 01-survey-and-catalog | 00-contract-probe |
| ... | ... |
```

## Dynamic seeding detection

If a parent TASK.md has `seeds:` in its frontmatter (from
dbt-paradigm), mark it as dynamic — write `from_seed:` instead of
`children:`.

## Done when

Migration plan exists with an entry for every live playbook.
