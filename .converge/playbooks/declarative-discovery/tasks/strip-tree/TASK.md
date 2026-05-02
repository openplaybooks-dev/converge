---
id: strip-tree
title: Delete task/tree/ directory, children.ts, tree-utils.ts; remove Unit.parent/Unit.children; hard cutover, no fallback
description: |
  Hard cutover. Every live playbook is declarative (phase 04). Every CLI
  consumer uses TaskDag (phase 05). Delete the tree abstractions entirely.

  Uses INVERTED red-green:
  - 01-red: write test asserting the thing does NOT exist → RED (it still does)
  - 02-green: delete the thing → GREEN

  After this phase there is one data model (DAG) and one way to discover
  tasks (declarations). No fallback. No env flag.

inputs:
  - .converge/playbooks/declarative-discovery/REFS.md
  - .converge/playbooks/declarative-discovery/migration-report.md
  - packages/core/src/task/tree
  - packages/core/src/task/unit/children.ts
  - packages/core/src/task/unit/unit.ts
  - packages/core/src/checkpoint/tree-utils.ts

outputs:
  - packages/core/src/task/unit/unit.ts (modified)
  - packages/core/src/index.ts (modified)
  - packages/core/tests/no-tree-abstractions.test.ts
  - docs/guides/declarative-tasks.md

checks:
  - id: typecheck-green
    cmd: pnpm -r typecheck
    description: All packages typecheck after deletion.
  - id: tests-green
    cmd: pnpm -r test
    description: All tests pass.
  - id: built-cli-exists
    cmd: test -x packages/cli/dist/index.js
    description: CLI builds end-to-end.
  - id: tree-directory-gone
    cmd: "! test -d packages/core/src/task/tree"
    description: The task/tree/ directory is deleted.
  - id: children-ts-gone
    cmd: "! test -f packages/core/src/task/unit/children.ts"
    description: Folder-scan children.ts is deleted.
  - id: tree-utils-gone
    cmd: "! test -f packages/core/src/checkpoint/tree-utils.ts"
    description: Tree-specific checkpoint utilities are deleted.
  - id: unit-no-parent-children
    cmd: "! grep -nE '(parent: Unit|children\\?: Unit\\[\\])' packages/core/src/task/unit/unit.ts"
    description: "Unit class no longer has parent: Unit or children?: Unit[] fields."
  - id: no-tasktree-imports
    cmd: "! grep -rln 'TaskTree\\|from.*task/tree' packages/ 2>/dev/null"
    description: Zero references to TaskTree or task/tree/ remain.
  - id: no-discover-children
    cmd: "! grep -rln 'discoverChildren\\|discoverEpicChildren' packages/core/src 2>/dev/null"
    description: Folder-scan discovery functions are gone.
  - id: tombstone-test-present
    cmd: test -s packages/core/tests/no-tree-abstractions.test.ts
    description: Tombstone test exists.
  - id: guide-present
    cmd: test -s docs/guides/declarative-tasks.md
    description: User-facing guide exists.
  - id: every-live-playbook-still-loads
    cmd: |
      while IFS= read -r path; do
        node packages/cli/dist/index.js --project-dir "$(dirname "$path")" compile --playbook="$(basename "$path")" || exit 1
      done < <(jq -r '.[] | select(.live == true) | .path' .converge/playbooks/declarative-discovery/playbooks-catalog.json)
    description: Every live playbook still loads after the cutover.

skills: []
references:
  - ".converge/playbooks/declarative-discovery/REFS.md"
  - "docs/design/declarative-discovery.md"

vars: {}
dependencies:
  - migrate-cli-consumers
children:
  - cleanup-unit
  - delete-children-ts
  - delete-task-tree
  - delete-tree-utils
  - tombstone-test
  - update-exports
  - user-guide
---

# 06 — Strip tree abstractions

**Inverted red-green at every leaf:**
1. Write a negative-existence test.
2. Run — RED.
3. Delete until GREEN.
4. Leave the test as a tombstone.

`pnpm -r typecheck && pnpm -r test` must stay green at every step.

## Deletion order

1. `packages/core/src/task/tree/` — entire directory
2. `packages/core/src/task/unit/children.ts` — folder-scan discovery
3. `packages/core/src/checkpoint/tree-utils.ts` — tree-specific utils
4. `Unit.parent`, `Unit.children`, `sortIndex` — tree fields
5. `packages/core/src/index.ts` — replace tree exports with DAG exports
6. Tombstone test — asserts all tree code is gone
7. User guide — docs/guides/declarative-tasks.md

## Done when

All 12 checks pass. There is one data model (DAG). There is one way
to discover tasks (declarations). The tree is gone.
