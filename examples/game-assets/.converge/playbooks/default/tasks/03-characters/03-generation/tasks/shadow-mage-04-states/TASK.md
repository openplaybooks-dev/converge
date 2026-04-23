---
id: shadow-mage-04-states
title: Generate Malachar animation states
description: Generate sprite sheets for each animation state
wbs:
  type: nodejs
  path: ./wbs/index.js
tags:
  - character
  - animation
  - sprites
vars:
  char_id: shadow-mage
  char_name: Malachar
  char_description: "Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations."
  palette: "16-bit retro, dark purple and black, magical glow effects, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Generate Malachar Animation States

Generate sprite sheets for all animation states of Malachar.

## Character Details

- **ID**: shadow-mage
- **Name**: Malachar
- **Description**: Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations.
- **Animation States**: ["idle","walk"]

## Task

This task will spawn subtasks for each animation state defined in the character specification.

Each animation state will be generated as a separate sprite sheet with individual frames.
