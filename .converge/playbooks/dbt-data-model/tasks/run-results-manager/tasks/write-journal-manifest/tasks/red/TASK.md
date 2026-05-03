---
id: write-journal-manifest-red
title: Red — writeJournalManifest doesn't exist yet
description: |
  Verify that writeJournalManifest() doesn't exist in the codebase yet.
  Expected RED.

inputs: []

outputs: []

checks:
  - id: function-missing
    cmd: "! grep -q 'writeJournalManifest' packages/core/src/manifest/run-results-manager.ts 2>/dev/null"
    description: writeJournalManifest doesn't exist yet (RED).

tags:
  - tdd
  - red
---

# Red — pre-implementation check

Verify `writeJournalManifest` doesn't exist in the codebase yet.

Check that `grep -r "writeJournalManifest" packages/` returns nothing.
