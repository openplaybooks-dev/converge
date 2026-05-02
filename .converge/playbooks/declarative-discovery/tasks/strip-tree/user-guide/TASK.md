---
id: user-guide
title: Write docs/guides/declarative-tasks.md — user-facing guide
description: |
  Write the guide for playbook authors using the new declarative model.
  Single leaf — no red/green needed for docs.

outputs:
  - docs/guides/declarative-tasks.md

checks:
  - id: guide-present
    cmd: test -s docs/guides/declarative-tasks.md
    description: User-facing guide exists and is non-empty.
  - id: guide-has-sections
    cmd: |
      grep -qE '^## ' docs/guides/declarative-tasks.md
    description: Guide has sections.

skills: []
references:
  - "docs/design/declarative-discovery.md"

vars: {}
dependencies: []
---

# 07 — User-facing guide

Write `docs/guides/declarative-tasks.md`:

## Required sections

### 1. The model
A playbook is a declared DAG. `playbook.yml` lists root tasks. Each
TASK.md declares `children:` (static) and/or `from_seed:` (dynamic).
There is no folder scanning. Undeclared tasks don't exist.

### 2. Authoring a new task
1. Create `tasks/<id>/TASK.md` with frontmatter and body
2. Add `children: [<id>]` to the parent's TASK.md
3. Run `converge compile` — the DAG now includes the new task
4. Run `converge run` — executes in topological order

### 3. The children: field
Bare ids: `children: [01-foo, 02-bar]`
With path override: `children: [{ id: 03-shared, path: ../shared/TASK.md }]`
Mixed: both forms in the same array

### 4. The from_seed: field
`from_seed: per-token` — children are spawned dynamically by a seed
(see dbt-paradigm guide). Virtual nodes become concrete at runtime.

### 5. depends_on vs children
- `children:` — structural DAG edges (parent declares child)
- `depends_on:` — execution ordering edges (child waits for dep)
- A child automatically depends_on its parent. Only add `depends_on:`
  for cross-branch dependencies.

### 6. Multi-parent
Two parents can declare the same child id. The child has two incoming
edges. Both parents must complete before the child executes (if they
are also in `depends_on:`).

### 7. Tooling
- `converge compile` — builds the DAG, writes manifest
- `converge list --select <expr>` — query the DAG
- `converge tree` — display topological layers
- `converge graph` — output DAG structure
- `converge inspect <id>` — show node details (edges, status, taskDef)

### 8. Migration from tree model
If you have a playbook from before declarative-discovery:
1. Run `converge debug --check-discovery` to see orphan tasks
2. Add `children:` to every parent TASK.md
3. Verify with `converge compile`

## Done when

Guide exists with all sections. Non-empty.
