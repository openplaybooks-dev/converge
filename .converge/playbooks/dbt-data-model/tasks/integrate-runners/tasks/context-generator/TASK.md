---
id: context-generator
title: Context generator — per-task context.json from manifest
description: |
  Create context-generator.ts that generates per-task context.json files
  from the manifest at execution start. Each context.json gives AI agents
  the complete local DAG neighborhood.

inputs:
  - packages/core/src/manifest/types.ts
  - packages/core/src/journal/structure.ts

outputs:
  - packages/core/src/manifest/context-generator.ts (new)
  - packages/core/tests/manifest/context-generator.test.ts (new)

checks:
  - id: module-exists
    cmd: test -s packages/core/src/manifest/context-generator.ts
    description: Context generator module exists.
  - id: tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- context-generator
    description: Context generator tests pass.

skills: []
references:
  - "packages/core/src/manifest/types.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 01 — Context generator

## Children

### red
Write tests for context.json generation. Verify each node's context includes
correct parents, children, siblings, depends_on, and path. Expected RED —
module doesn't exist.

### green
Implement context-generator.ts. From manifest, compute siblings (nodes sharing
a parent), then write context.json per node to flat task directories.

## Context JSON schema

```json
{
  "id": "01a-catalog",
  "parents": ["01-survey"],
  "children": ["01a-i-inventory"],
  "depends_on": [],
  "depended_on_by": ["01b-report"],
  "siblings": ["01b-report"],
  "path": ".converge/playbooks/.../TASK.md",
  "status": "pending"
}
```

Siblings = all nodes that share at least one parent with this node.
