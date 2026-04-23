---
id: hero-knight-04-states
title: Generate Sir Aldric animation states
description: Generate sprite sheets for each animation state
wbs:
  type: nodejs
  path: ./wbs/index.js
tags:
  - character
  - animation
  - sprites
vars:
  char_id: hero-knight
  char_name: Sir Aldric
  char_description: "Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement."
  palette: "16-bit retro, blue and silver armor, red accent, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Generate Sir Aldric Animation States

Generate sprite sheets for all animation states of Sir Aldric.

## Character Details

- **ID**: hero-knight
- **Name**: Sir Aldric
- **Description**: Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement.
- **Animation States**: ["idle","walk"]

## Task

This task will spawn subtasks for each animation state defined in the character specification.

Each animation state will be generated as a separate sprite sheet with individual frames.
