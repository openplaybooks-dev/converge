---
id: delete-children-ts
title: Delete packages/core/src/task/unit/children.ts
description: Delete folder-scan discovery functions (discoverChildren, discoverEpicChildren).
children:
  - delete-children-ts-red
  - delete-children-ts-green
---

# 02 — Delete children.ts

### red
Add to tombstone test: `expect(existsSync('packages/core/src/task/unit/children.ts')).toBe(false)`. Run — RED.

### green
`rm packages/core/src/task/unit/children.ts`. Verify no remaining imports. Run tests — GREEN.
