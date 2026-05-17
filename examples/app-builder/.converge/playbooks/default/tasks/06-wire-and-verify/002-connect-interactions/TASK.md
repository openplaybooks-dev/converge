---
id: 002-connect-interactions
title: Connect Interactions
description: Replace static placeholders with real handlers, persisted preferences, and mounted feature modules
blocking: true
depends_on:
  - 001-wire-routes
skills:
  - react-managing-state
  - react-animating-apps
inputs:
  - .stitch/interactions.json
  - src/features/**/*.tsx
  - src/state/**/*.ts
  - src/screens/**/*.tsx
outputs:
  - src/screens/**/*.tsx
  - src/components/**/*.tsx
checks:
  - id: handlers-not-empty
    cmd: node .converge/playbooks/default/tasks/06-wire-and-verify/003-verify/verify-assets-and-interactions.mjs
    description: handlers and interactions are wired
---
# Connect Interactions

Connect each declared interaction to real UI behavior.

Do not leave:

- empty click handlers
- static buttons with no effect
- placeholder text like TODO, Coming soon, or Lorem ipsum

