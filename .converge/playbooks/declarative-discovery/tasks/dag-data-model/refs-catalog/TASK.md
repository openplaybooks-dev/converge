---
id: refs-catalog
title: Write REFS.md (tree-abstraction callsite inventory) + playbooks-catalog.json
description: |
  Catalog every tree-abstraction callsite that phase 06 must delete, and
  every live playbook that phase 04 must migrate. These are the input
  inventories for the two largest phases. Single leaf — no red/green.

inputs:
  - packages/core/src/task/tree
  - packages/core/src/task/unit/children.ts
  - packages/core/src/checkpoint/tree-utils.ts
  - packages/cli/src
  - .converge/playbooks

outputs:
  - .converge/playbooks/declarative-discovery/REFS.md
  - .converge/playbooks/declarative-discovery/playbooks-catalog.json

checks:
  - id: refs-md-present
    cmd: test -s .converge/playbooks/declarative-discovery/REFS.md
    description: REFS.md exists and is non-empty.
  - id: catalog-valid-json
    cmd: jq -e 'type == "array"' .converge/playbooks/declarative-discovery/playbooks-catalog.json
    description: playbooks-catalog.json is a JSON array.
  - id: catalog-has-entries
    cmd: jq -e 'length > 0' .converge/playbooks/declarative-discovery/playbooks-catalog.json
    description: Catalog has at least one entry.
  - id: catalog-each-entry-has-fields
    cmd: jq -e 'all(has("id") and has("path") and has("live"))' .converge/playbooks/declarative-discovery/playbooks-catalog.json
    description: Each catalog entry has id, path, live fields.

skills: []
references:
  - "packages/core/src/task/tree"
  - ".converge/playbooks"

vars: {}
dependencies: []
---

# 06 — REFS inventory + playbook catalog

Two deliverables: a tree-abstraction callsite inventory for phase 06,
and a playbook catalog for phase 04.

## REFS.md

Write `.converge/playbooks/declarative-discovery/REFS.md`:

```markdown
# Tree-abstraction callsite inventory

## Tree abstractions to delete (phase 06)

### Directories
- `packages/core/src/task/tree/` — entire directory
  - task-tree.ts, tree-node.ts, traversal.ts, visualizer.ts, types.ts,
    journal-tree.ts, index.ts

### Files
- `packages/core/src/task/unit/children.ts` — discoverChildren,
  discoverEpicChildren
- `packages/core/src/checkpoint/tree-utils.ts` — hashTaskTree,
  discoverTaskHierarchy

### Unit fields to remove
- `packages/core/src/task/unit/unit.ts`
  - `parent: Unit | null`
  - `children?: Unit[]`
  - `sortIndex`
  - `static compareBySortIndex`

## CLI consumers to migrate (phase 05)

For each, list the file, the current TaskTree usage, the equivalent
TaskDag replacement:

1. `packages/cli/src/commands-run.ts` — TaskTree.load() + iteration
   loop → executeDag()
2. `packages/cli/src/commands-list.ts` — task tree walk → dag.nodes
3. `packages/cli/src/commands-tree.ts` — TaskTree.load() +
   printTaskTree() → topologicalOrder() + layer display
4. `packages/cli/src/commands-gantt.ts` — tree traversal →
   topologicalOrder()
5. `packages/cli/src/commands-graph.ts` — TaskTree.load() →
   dag.toManifest()
6. `packages/cli/src/commands-inspect.ts` — walkTaskTree() →
   dag.nodes.get(id)
7. `packages/cli/src/next-task.ts` — buildTaskTree(), getTaskStates()
   → TaskDag queries
8. `packages/core/src/converge/converge-runner.ts` — TaskTree.load()
   in wave loop → executeDag()

## Every import of task/tree

```
(find and list every file that imports from 'task/tree' or references
TaskTree, discoverChildren, discoverEpicChildren)
```
```

## playbooks-catalog.json

Walk `.converge/playbooks/` and `examples/`. For each playbook that has
a `playbook.yml`:

```json
[
  {
    "id": "cli-redesign",
    "path": ".converge/playbooks/cli-redesign",
    "live": true
  }
]
```

- `id` — directory basename
- `path` — relative path from project root
- `live` — `true` if the playbook is not archived/disabled

Exclude `declarative-discovery` from the catalog (self-host safety —
we don't migrate the playbook that's running).

Generate by running:
```bash
for d in .converge/playbooks/*/; do
  id=$(basename "$d")
  [ "$id" = "declarative-discovery" ] && continue
  test -f "$d/playbook.yml" || continue
  echo "{\"id\": \"$id\", \"path\": \"$d\", \"live\": true}"
done | jq -s '.'
```

## Done when

REFS.md exists with all sections. Catalog is a valid JSON array with
all live playbooks (except this one).
