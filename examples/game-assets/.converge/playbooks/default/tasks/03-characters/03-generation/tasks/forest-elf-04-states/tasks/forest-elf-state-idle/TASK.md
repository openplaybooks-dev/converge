---
id: forest-elf-state-idle
title: Generate Lirael idle animation
description: Idle animation for Lirael
tags:
  - character
  - animation
  - spritesheet
outputs:
  - spritesheets/forest-elf/idle.png
  - spritesheets/forest-elf/idle.atlas.json
checks:
  - id: spritesheet-exists
    description: Spritesheet exists
    cmd: test -s spritesheets/forest-elf/idle.png
vars:
  char_id: forest-elf
  char_name: Lirael
  char_description: "Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses."
  palette: "16-bit retro, green and brown tones, natural forest colors, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  state_name: idle
  state_description: Idle animation for Lirael
---

# Generate Lirael idle Animation

Create sprite sheet for idle animation state.

## Character Details

- **ID**: forest-elf
- **Name**: Lirael
- **Animation**: idle
- **Palette**: 16-bit retro, green and brown tones, natural forest colors, limited to 16 colors

## Task

Generate complete sprite sheet for idle animation:
- Multiple frames showing animation progression
- Consistent with character design
- Optimized for game engine

## Output

Create sprite sheet files:
- `spritesheets/forest-elf/idle.png` - Packed sprite sheet
- `spritesheets/forest-elf/idle.atlas.json` - Frame metadata

## Verification

- Sprite sheet exists and is complete
- Atlas JSON has correct frame data
- Animation loops smoothly
- Matches character palette
