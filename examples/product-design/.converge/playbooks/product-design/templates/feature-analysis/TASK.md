---
id: feature-analysis
title: Feature Analysis Template
description: Analyze one epic and produce its feature catalog
mode: leaf
depends_on: []
inputs:
  - docs/product/epics.json
outputs:
  - docs/product/features/{{epicId}}/catalog.json
checks:
  - id: catalog-exists
    cmd: test -f docs/product/features/{{epicId}}/catalog.json
skills:
  - feature-prioritization
---

# Feature Analysis

Read epics.json, find epic {{epicId}}, write its feature catalog.