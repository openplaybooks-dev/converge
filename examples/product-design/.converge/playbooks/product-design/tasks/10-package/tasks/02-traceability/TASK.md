---
id: 02-traceability
title: Traceability Matrix
description: Map the complete epic → feature → view → design hierarchy
blocking: true
depends_on:
  - 01-handoff
inputs:
  - docs/product/epics.json
outputs:
  - docs/product/TRACEABILITY.md
checks:
  - id: traceability-exists
    cmd: test -f docs/product/TRACEABILITY.md
skills:
  - traceability
---

# Traceability Matrix

Write TRACEABILITY.md mapping epic → feature → view → design.