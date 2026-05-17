---
id: 002-create-mock-data
title: Create Mock Data
description: Implement the mock content model that powers the screens and interactions
blocking: true
depends_on:
  - 001-analyze-interactions
skills:
  - react-managing-state
inputs:
  - PRD.md
  - .stitch/interactions.json
  - .stitch/screens.json
outputs:
  - src/data/mock-data.ts
  - src/data/types.ts
checks:
  - id: mock-data-exists
    cmd: test -f src/data/mock-data.ts
    description: mock data exists
  - id: types-exist
    cmd: test -f src/data/types.ts
    description: data types exist
---
# Create Mock Data

Create realistic mock data and TypeScript types that make the app feel populated and testable.

Prefer a few coherent entities over many shallow ones.

