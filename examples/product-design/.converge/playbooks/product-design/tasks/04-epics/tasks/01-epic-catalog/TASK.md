---
id: 01-epic-catalog
title: Epic Catalog
description: Write epics.json with all epic definitions
blocking: true
depends_on: []
inputs:
  - docs/product/PRODUCT_BRIEF.md
  - docs/product/research/RESEARCH_REPORT.md
  - docs/product/ARCHITECTURE.md
outputs:
  - docs/product/epics.json
checks:
  - id: epics-json-exists
    cmd: test -f docs/product/epics.json
  - id: epics-json-valid
    cmd: python3 -c "import json; json.load(open('docs/product/epics.json'))"
skills:
  - epic-decomposition
---

# Epic Catalog

Write epics.json.