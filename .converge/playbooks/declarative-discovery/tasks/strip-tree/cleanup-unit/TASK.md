---
id: cleanup-unit
title: Remove Unit.parent, Unit.children, sortIndex from unit.ts
description: |
  Strip tree-specific fields from the Unit class. Keep parentIds,
  childIds, depends_on (string arrays — DAG edges). Remove parent
  (Unit reference), children (Unit[]), sortIndex, compareBySortIndex.

children:
  - cleanup-unit-red
  - cleanup-unit-green
---

# 04 — Cleanup Unit class

### red
Add assertions: grep for `parent: Unit`, `children?: Unit[]`,
`sortIndex` in unit.ts — they still exist. RED.

### green
Remove the tree fields. Fix any callers that still reference
`unit.parent` or `unit.children` — they must use
`unit.parentIds` / `unit.childIds` (string arrays) instead.
