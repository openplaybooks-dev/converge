---
id: hero-knight-state-idle
title: Generate Sir Aldric idle animation
description: Idle animation for Sir Aldric
tags:
  - character
  - animation
  - spritesheet
outputs:
  - spritesheets/hero-knight/idle.png
  - spritesheets/hero-knight/idle.atlas.json
checks:
  - id: spritesheet-exists
    description: Spritesheet exists
    cmd: test -s spritesheets/hero-knight/idle.png
vars:
  char_id: hero-knight
  char_name: Sir Aldric
  char_description: "Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement."
  palette: "16-bit retro, blue and silver armor, red accent, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  state_name: idle
  state_description: Idle animation for Sir Aldric
---

# Generate Sir Aldric idle Animation

Create sprite sheet for idle animation state.

## Character Details

- **ID**: hero-knight
- **Name**: Sir Aldric
- **Animation**: idle
- **Palette**: 16-bit retro, blue and silver armor, red accent, limited to 16 colors

## Task

Generate complete sprite sheet for idle animation:
- Multiple frames showing animation progression
- Consistent with character design
- Optimized for game engine

## Output

Create sprite sheet files:
- `spritesheets/hero-knight/idle.png` - Packed sprite sheet
- `spritesheets/hero-knight/idle.atlas.json` - Frame metadata

## Verification

- Sprite sheet exists and is complete
- Atlas JSON has correct frame data
- Animation loops smoothly
- Matches character palette
