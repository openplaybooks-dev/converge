---
id: 001-wire-routes
title: Wire Routes
description: Ensure every screen is mounted in the router and reachable through the app shell
blocking: true
skills:
  - react-implementing-routing
inputs:
  - .stitch/screens.json
  - src/screens/**/*.tsx
outputs:
  - src/app/router.tsx
  - src/app/AppShell.tsx
checks:
  - id: router-exists
    cmd: test -f src/app/router.tsx
    description: router exists
---
# Wire Routes

Update the router so every route in `.stitch/screens.json` is mounted.

Requirements:

- use `react-router-dom`
- preserve the visual shell
- include navigation affordances that match the UX
- keep lazy loading optional; do not over-engineer

