---
id: forest-elf-04-states
title: Generate Lirael animation states
description: Generate sprite sheets for each animation state
wbs:
  type: nodejs
  path: ./wbs/index.js
tags:
  - character
  - animation
  - sprites
vars:
  char_id: forest-elf
  char_name: Lirael
  char_description: "Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses."
  palette: "16-bit retro, green and brown tones, natural forest colors, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Generate Lirael Animation States

Generate sprite sheets for all animation states of Lirael.

## Character Details

- **ID**: forest-elf
- **Name**: Lirael
- **Description**: Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses.
- **Animation States**: ["idle","walk"]

## Task

This task will spawn subtasks for each animation state defined in the character specification.

Each animation state will be generated as a separate sprite sheet with individual frames.
