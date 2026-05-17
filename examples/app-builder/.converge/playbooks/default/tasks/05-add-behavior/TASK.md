---
id: 05-add-behavior
title: Add Behavior
description: Define interactions, create mock data, implement state, and add playful features
blocking: true
depends_on:
  - 04-build-screens
outputs:
  - .stitch/interactions.json
  - src/data/mock-data.ts
  - src/state/**/*.ts
  - src/features/**/*.tsx
checks:
  - id: interactions-exist
    cmd: test -f .stitch/interactions.json
    description: interaction manifest exists
  - id: mock-data-exists
    cmd: test -f src/data/mock-data.ts
    description: mock data exists
---
# Add Behavior

Turn the screens into a live-feeling app by defining data, state, and at least one playful interaction module.

