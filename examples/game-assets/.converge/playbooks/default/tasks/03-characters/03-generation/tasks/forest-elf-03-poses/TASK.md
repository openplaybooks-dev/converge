---
id: forest-elf-03-poses
title: Generate Lirael poses
description: "Generate pose variations (attack, defend, jump, crouch)"
wbs:
  type: nodejs
  path: ./wbs/index.js
tags:
  - character
  - poses
vars:
  char_id: forest-elf
  char_name: Lirael
  char_description: "Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses."
  palette: "16-bit retro, green and brown tones, natural forest colors, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Generate Lirael Poses

Generate pose variations for Lirael.

## Character Details

- **ID**: forest-elf
- **Name**: Lirael
- **Description**: Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses.

## Task

This task will spawn subtasks for each pose variation:
- Attack pose
- Defend pose
- Jump pose
- Crouch pose

Each pose will be generated as a separate subtask.
