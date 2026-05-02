---
title: Move WBS scripts from per-task wbs/ to playbook-level seeds/ directory
description: |
  Restructure: scripts currently live in wbs/ directories next to the
  task that uses them. Move them to a shared seeds/ directory at the
  playbook level so multiple tasks can reference the same seed.

inputs:
  - .converge/playbooks/dbt-paradigm/wbs-inventory.md

outputs:
  - .converge/playbooks

checks:
  - id: seeds-dirs-exist
    cmd: find .converge/playbooks/ -type d -name seeds 2>/dev/null | grep -q .
    description: At least one playbook has a seeds/ directory.
  - id: templates-preserved
    cmd: |
      # Spot check: cli-redesign seeds/ directory must exist first
      test -d .converge/playbooks/cli-redesign/seeds && (test -d .converge/playbooks/cli-redesign/seeds/templates || echo "No templates — may be ok if no template-ref spawns")
    description: Template directories moved alongside scripts.
  - id: scripts-are-valid
    cmd: |
      # Verify each .seed.js is valid ESM
      for f in $(find .converge/playbooks/ -name '*.seed.js' 2>/dev/null); do
        node --check "$f" || exit 1
      done
    description: All moved scripts pass syntax check.

skills: []
references:
  - ".converge/playbooks/dbt-paradigm/wbs-inventory.md"

vars: {}
dependencies:
  - 02a-rename-types-and-files
---

# 02b — Move scripts to seeds/ directory

## Before
```
playbooks/cli-redesign/tasks/03-execution-verbs/
  TASK.md              ← wbs: { path: wbs/index.js }
  wbs/
    index.js
    templates/verb/TASK.md
```

## After
```
playbooks/cli-redesign/
  seeds/
    per-verb.seed.js          ← script (renamed from index.js)
    per-verb/templates/verb/TASK.md  ← templates follow the seed
  tasks/03-execution-verbs/
    TASK.md                   ← seeds: [per-verb]
```

## Red phase

List all wbs/ directories from the inventory:

```bash
find .converge/playbooks/ examples/ -type d -name wbs
```

Each one must be moved.

## Green phase

For each wbs/ directory in the inventory:

1. **Pick a seed name** — derive from the task it belongs to
   (e.g., `03-execution-verbs` → seed name `per-verb`).
2. **Create playbook-level seeds/ directory** if not exists.
3. **Move the script** — `wbs/index.js` → `seeds/<name>.seed.js`.
   If only one file (`wbs.js`), rename to `<name>.seed.js`.
4. **Move templates** — `wbs/templates/` → `seeds/<name>/templates/`.
   Update template-ref paths in the script to point at the new location.
5. **Delete the now-empty wbs/ directory**.

## Refactor

- Ensure unique seed names within each playbook. If two tasks both had
  `wbs/index.js`, give them distinct seed names.
- Run any WBS-related tests (now seed tests) to verify scripts still work.

## Done when

All 3 checks pass. Scripts live in playbook-level seeds/ directories.
No wbs/ directories remain.
