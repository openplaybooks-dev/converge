---
id: tombstone-test
title: Tombstone test — comprehensive assertion that ALL tree code is gone
description: |
  Final tombstone test. Assertions:
  - task/tree/ directory gone
  - children.ts gone
  - tree-utils.ts gone
  - Unit has no parent/children/sortIndex fields
  - No TaskTree imports anywhere
  - No discoverChildren anywhere
  - No folder-scan functions anywhere
  - Undeclared TASK.md files are NOT discovered

children:
  - tombstone-test-red
  - tombstone-test-green
---

# 06 — Tombstone test

### red
Write the comprehensive tombstone test. Run — some assertions fail
because not all deletions are complete. RED.

### green
After all previous deletions complete, the tombstone test passes.
GREEN. This test stays as a permanent guard against tree code
re-introduction.
