---
id: prune-checkpoint-index-red
title: Red — index.ts still exports deleted modules
description: |
  Verify checkpoint/index.ts exports manager.ts, filesystem-status.ts, etc.
  Expected RED — not yet pruned.

inputs:
  - packages/core/src/checkpoint/index.ts

outputs: []

checks:
  - id: exports-manager
    cmd: grep -q 'manager' packages/core/src/checkpoint/index.ts
    description: index.ts still exports manager.ts (pre-prune).

tags:
  - tdd
  - red
---

# Red — pre-prune baseline

Verify checkpoint/index.ts still exports the modules that are about to be deleted.
