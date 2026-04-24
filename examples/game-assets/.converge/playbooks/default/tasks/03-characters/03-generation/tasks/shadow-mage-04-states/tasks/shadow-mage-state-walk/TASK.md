---
id: shadow-mage-state-walk
title: Generate Malachar walk animation
description: Walk animation for Malachar
tags:
  - character
  - animation
  - spritesheet
outputs:
  - spritesheets/shadow-mage/walk.png
  - spritesheets/shadow-mage/walk.atlas.json
checks:
  - id: spritesheet-exists
    description: Spritesheet exists
    cmd: test -s spritesheets/shadow-mage/walk.png
vars:
  char_id: shadow-mage
  char_name: Malachar
  char_description: "Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations."
  palette: "16-bit retro, dark purple and black, magical glow effects, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  state_name: walk
  state_description: Walk animation for Malachar
---

# Generate Malachar walk Animation

Create sprite sheet for walk animation state.

## Character Details

- **ID**: shadow-mage
- **Name**: Malachar
- **Animation**: walk
- **Palette**: 16-bit retro, dark purple and black, magical glow effects, limited to 16 colors

## Task

Generate complete sprite sheet for walk animation:
- Multiple frames showing animation progression
- Consistent with character design
- Optimized for game engine

## Output

Create sprite sheet files:
- `spritesheets/shadow-mage/walk.png` - Packed sprite sheet
- `spritesheets/shadow-mage/walk.atlas.json` - Frame metadata

## Verification

- Sprite sheet exists and is complete
- Atlas JSON has correct frame data
- Animation loops smoothly
- Matches character palette
