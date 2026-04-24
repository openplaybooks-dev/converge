---
id: shadow-mage-state-idle
title: Generate Malachar idle animation
description: Idle animation for Malachar
tags:
  - character
  - animation
  - spritesheet
outputs:
  - spritesheets/shadow-mage/idle.png
  - spritesheets/shadow-mage/idle.atlas.json
checks:
  - id: spritesheet-exists
    description: Spritesheet exists
    cmd: test -s spritesheets/shadow-mage/idle.png
vars:
  char_id: shadow-mage
  char_name: Malachar
  char_description: "Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations."
  palette: "16-bit retro, dark purple and black, magical glow effects, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  state_name: idle
  state_description: Idle animation for Malachar
---

# Generate Malachar idle Animation

Create sprite sheet for idle animation state.

## Character Details

- **ID**: shadow-mage
- **Name**: Malachar
- **Animation**: idle
- **Palette**: 16-bit retro, dark purple and black, magical glow effects, limited to 16 colors

## Task

Generate complete sprite sheet for idle animation:
- Multiple frames showing animation progression
- Consistent with character design
- Optimized for game engine

## Output

Create sprite sheet files:
- `spritesheets/shadow-mage/idle.png` - Packed sprite sheet
- `spritesheets/shadow-mage/idle.atlas.json` - Frame metadata

## Verification

- Sprite sheet exists and is complete
- Atlas JSON has correct frame data
- Animation loops smoothly
- Matches character palette
