---
id: 001-analyze-interactions
title: Analyze Interactions
description: Turn UX intent into a concrete interaction manifest for state, persistence, and playful features
blocking: true
inputs:
  - .stitch/UX.md
  - .stitch/screens.json
  - src/screens/**/*.tsx
outputs:
  - .stitch/interactions.json
checks:
  - id: interactions-exist
    cmd: test -f .stitch/interactions.json
    description: interactions manifest exists
---
# Analyze Interactions

Create `.stitch/interactions.json`.

The manifest must include:

- route-level interactive elements
- search/filter needs
- persisted preferences
- one or more playful modules such as drag/drop, quiz, card shuffle, or builder toy
- data entities required by each interaction

