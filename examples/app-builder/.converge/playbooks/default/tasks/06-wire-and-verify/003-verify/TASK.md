---
id: 003-verify
title: Verify Generated App
description: Add smoke tests and verify buildability, asset usage, and interactive completeness
blocking: true
depends_on:
  - 002-connect-interactions
skills:
  - react-testing-apps
inputs:
  - .stitch/assets/manifest.json
  - .stitch/interactions.json
  - src/**/*.tsx
outputs:
  - src/app/app.test.tsx
  - src/features/playground.test.tsx
checks:
  - id: structure-verifies
    cmd: node .converge/playbooks/default/tasks/06-wire-and-verify/003-verify/verify-generated-app.mjs
    description: structure verifies
  - id: assets-and-interactions-verify
    cmd: node .converge/playbooks/default/tasks/06-wire-and-verify/003-verify/verify-assets-and-interactions.mjs
    description: assets and interactions verify
---
# Verify Generated App

Add a minimal but real test suite and ensure the generated app satisfies the example contract:

- theme and router exist
- routes render
- generated assets are referenced
- a persisted preference path exists
- at least one playful interaction is mounted

