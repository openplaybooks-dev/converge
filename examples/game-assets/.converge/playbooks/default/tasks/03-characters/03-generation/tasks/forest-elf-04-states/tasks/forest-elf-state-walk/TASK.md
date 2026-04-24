---
id: forest-elf-state-walk
title: Generate Lirael walk animation
description: Walk animation for Lirael
tags:
  - character
  - animation
  - spritesheet
outputs:
  - spritesheets/forest-elf/walk.png
  - spritesheets/forest-elf/walk.atlas.json
checks:
  - id: spritesheet-exists
    description: Spritesheet exists
    cmd: test -s spritesheets/forest-elf/walk.png
vars:
  char_id: forest-elf
  char_name: Lirael
  char_description: "Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses."
  palette: "16-bit retro, green and brown tones, natural forest colors, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  state_name: walk
  state_description: Walk animation for Lirael
---

# Generate Lirael walk Animation

Create sprite sheet for walk animation state.

## Character Details

- **ID**: forest-elf
- **Name**: Lirael
- **Animation**: walk
- **Palette**: 16-bit retro, green and brown tones, natural forest colors, limited to 16 colors

## Task

Generate complete sprite sheet for walk animation:
- Multiple frames showing animation progression
- Consistent with character design
- Optimized for game engine

## Output

Create sprite sheet files:
- `spritesheets/forest-elf/walk.png` - Packed sprite sheet
- `spritesheets/forest-elf/walk.atlas.json` - Frame metadata

## Verification

- Sprite sheet exists and is complete
- Atlas JSON has correct frame data
- Animation loops smoothly
- Matches character palette
