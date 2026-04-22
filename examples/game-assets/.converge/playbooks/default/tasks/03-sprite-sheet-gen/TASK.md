---
id: 03-sprite-sheet-gen
title: Sprite Sheet Generation — Character animation sheets via Nano-banana
description: For each character + animation_state, generate a sprite sheet via Nano-banana. Uses locked character refs as identity anchors. Output: spritesheets/{character_id}/{state}.png — a grid of sprite frames.
dependencies:
  - 02-character-refs
wbs:
  type: nodejs
  path: ./wbs/index.cjs
blocking: true
tags:
  - spritesheet
  - character
  - animation
inputs:
  - sprites.json
  - characters/**/ref.json
  - characters/**/ref.png
outputs:
  - spritesheets/**/*.png
  - spritesheets/**/*.frames.json
checks:
  - id: spritesheets-generated
    cmd: find spritesheets -name '*.png' -type f | wc -l | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
    description: At least one sprite sheet was generated
---

# Sprite Sheet Generation

Generate animation sprite sheets for each character. Each sheet is a grid of frames for one animation state.

## Output Structure

```
spritesheets/{char_id}/{state}.png    # sprite sheet grid
spritesheets/{char_id}/{state}.frames.json  # frame coords
```

## Sheet Layout

- `vars.sprites_per_row` sprites per row
- Each frame is `vars.sprite_resolution` x `vars.sprite_resolution` pixels
- Total sheet size: `(sprites_per_row * sprite_resolution)` x `(ceil(frames/sprites_per_row) * sprite_resolution)`

## Generation Strategy

For each (character, state) pair:
1. Load the locked character ref.png as identity anchor
2. Build prompt: "pixel art {state} animation frame, {palette}, consistent with ref"
3. Call Nano-banana with ref + prompt
4. Assemble frames into sprite sheet

## Frame Count by State

| State | Frames |
|-------|--------|
| idle  | 4      |
| walk  | 8      |
| attack| 6      |
| hurt  | 4      |

Default for test scope: 4 frames per state.