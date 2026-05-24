---
id: 01-catalog
title: Feature Catalog
description: Write feature catalog for one epic
blocking: true
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

# Feature Catalog

Write catalog.json for epic {{epicId}}.