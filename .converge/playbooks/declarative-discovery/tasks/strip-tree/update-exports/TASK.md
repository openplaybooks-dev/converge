---
id: update-exports
title: Update packages/core/src/index.ts — replace tree exports with DAG exports
description: Remove tree barrel exports, add DAG barrel exports.
children:
  - update-exports-red
  - update-exports-green
---

# 05 — Update exports

### red
Add assertion: `index.ts` still exports tree symbols. RED.

### green
Replace `export * from './task/tree/index.js'` with
`export * from './dag/index.js'`. Verify no tree imports remain
in the package's public API. GREEN.
