---
id: hero-knight-03-poses
title: Generate Sir Aldric poses
description: "Generate pose variations (attack, defend, jump, crouch)"
wbs:
  type: nodejs
  path: ./wbs/index.js
tags:
  - character
  - poses
vars:
  char_id: hero-knight
  char_name: Sir Aldric
  char_description: "Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement."
  palette: "16-bit retro, blue and silver armor, red accent, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Generate Sir Aldric Poses

Generate pose variations for Sir Aldric.

## Character Details

- **ID**: hero-knight
- **Name**: Sir Aldric
- **Description**: Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement.

## Task

This task will spawn subtasks for each pose variation:
- Attack pose
- Defend pose
- Jump pose
- Crouch pose

Each pose will be generated as a separate subtask.
