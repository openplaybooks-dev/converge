---
id: shadow-mage-03-poses
title: Generate Malachar poses
description: "Generate pose variations (attack, defend, jump, crouch)"
wbs:
  type: nodejs
  path: ./wbs/index.js
tags:
  - character
  - poses
vars:
  char_id: shadow-mage
  char_name: Malachar
  char_description: "Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations."
  palette: "16-bit retro, dark purple and black, magical glow effects, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Generate Malachar Poses

Generate pose variations for Malachar.

## Character Details

- **ID**: shadow-mage
- **Name**: Malachar
- **Description**: Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations.

## Task

This task will spawn subtasks for each pose variation:
- Attack pose
- Defend pose
- Jump pose
- Crouch pose

Each pose will be generated as a separate subtask.
