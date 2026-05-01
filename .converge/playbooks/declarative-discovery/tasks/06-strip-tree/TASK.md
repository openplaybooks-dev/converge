---
title: Delete task/tree/ directory, children.ts, tree-utils.ts; remove Unit.parent and Unit.children; hard cutover
description: |
  Hard cutover. Every live playbook is declarative (phase 04). Every CLI
  consumer uses TaskDag (phase 05). Delete the tree abstractions entirely:
  the task/tree/ directory, discoverChildren() folder-scan logic,
  tree-utils.ts, and the Unit.parent/Unit.children fields that tied the
  unit class to the tree model. After this phase there is one data model
  (DAG) and one way to discover tasks (declarations).

inputs:
  - .converge/playbooks/declarative-discovery/REFS.md
  - .converge/playbooks/declarative-discovery/migration-report.md
  - packages/core/src/task/tree
  - packages/core/src/task/unit/children.ts
  - packages/core/src/task/unit/unit.ts
  - packages/core/src/checkpoint/tree-utils.ts

outputs:
  - packages/core/src/task/unit/unit.ts
  - packages/core/src/index.ts
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
    description: Unit class no longer has parent: Unit or children?: Unit[] fields.
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
  - 05-migrate-cli-consumers
---

# 06 — Strip tree abstractions

Inverted red-green at every leaf:
1. Write a negative-existence test.
2. Run — RED.
3. Delete until GREEN.
4. Leave the test as a tombstone.

`pnpm -r typecheck && pnpm -r test` must stay green at every step.

## Deletion order (to keep typecheck green)

### 1. Delete `packages/core/src/task/tree/`
Entire directory:
- `task-tree.ts` — TaskTree class
- `tree-node.ts` — TreeNode class
- `traversal.ts` — tree traversal utilities
- `visualizer.ts` — tree visualization
- `types.ts` — tree type definitions
- `journal-tree.ts` — journal tree
- `index.ts` — barrel export

### 2. Delete `packages/core/src/task/unit/children.ts`
Folder-scan discovery functions: `discoverChildren()`,
`discoverEpicChildren()`.

### 3. Delete `packages/core/src/checkpoint/tree-utils.ts`
Tree-specific checkpoint utilities: `hashTaskTree()`,
`discoverTaskHierarchy()`.

### 4. Clean up `Unit` class
Remove from `packages/core/src/task/unit/unit.ts`:
- `parent: Unit | null`
- `children?: Unit[]`
- `sortIndex` (derived from path — tree concept)
- `static compareBySortIndex`

Keep:
- `parentIds: string[]` (DAG incoming edges)
- `childIds: string[]` (DAG outgoing edges)
- `depends_on: string[]` (execution dependencies)

### 5. Update exports
`packages/core/src/index.ts`:
- Remove tree exports
- Add DAG exports (`dag/index.ts`)

## Tombstone test

`packages/core/tests/no-tree-abstractions.test.ts`:
- `expect(fs.existsSync('packages/core/src/task/tree')).toBe(false)`
- `expect(fs.existsSync('packages/core/src/task/unit/children.ts')).toBe(false)`
- Source grep: no `TaskTree`, no `discoverChildren` in source.
- Behavioral: undeclared TASK.md files in `tasks/` are NOT discovered.

## User-facing guide

`docs/guides/declarative-tasks.md`:

1. **The model.** A playbook is a declared DAG. `playbook.yml` lists
   roots; each TASK.md declares `children:` and `depends_on:`.
2. **Authoring.** Write TASK.md → add `children:` to parent. The
   declaration is mandatory — undeclared tasks don't exist.
3. **Hybrid syntax.** Bare id, object form with `path:`, `from_seed:`.
4. **Multi-parent.** Two parents can claim the same child id.
5. **Spawning seeds.** Cross-reference dbt-paradigm guide.
6. **Tooling.** `converge debug --check-discovery` reports orphans.

## Done when

All 12 checks pass. There is one data model (DAG). There is one way to
discover tasks (declarations). The tree is gone.
