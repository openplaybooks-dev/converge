---
id: shadow-mage-spritesheet-walk
title: Generate Malachar walk sprite sheet
description: Walk animation sprite sheet for Malachar
tags:
  - character
  - animation
  - spritesheet
outputs:
  - assets/characters/shadow-mage/spritesheets/walk/walk.png
  - assets/characters/shadow-mage/spritesheets/walk/walk.prompt.txt
checks:
  - id: spritesheet-png-is-4x4-grid
    description: "Sheet is a square 4x4 grid (width == height, divisible by 4, >=256px)"
    cmd: "python -c \"from PIL import Image; im=Image.open('assets/characters/shadow-mage/spritesheets/walk/walk.png'); w,h=im.size; assert w==h, f'not square: {im.size}'; assert w>=256 and w%4==0, f'expected 4x4 grid (square, side>=256, divisible by 4): {im.size}'\"\n"
  - id: prompt-saved
    description: Sibling .prompt.txt exists for debugging
    cmd: test -s assets/characters/shadow-mage/spritesheets/walk/walk.prompt.txt
vars:
  char_id: shadow-mage
  char_name: Malachar
  char_description: "Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations."
  palette: "16-bit retro, dark purple and black, magical glow effects, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  state_name: walk
  state_description: Walk animation sprite sheet for Malachar
---

# Malachar walk Sprite Sheet

Runs `scripts/generate_spritesheet.py shadow-mage walk`. **One image-gen call** draws a 4x4 grid (16 frames) on one canvas, so character identity stays consistent across frames.

Outputs land in `assets/characters/shadow-mage/spritesheets/walk/`:
- `walk.png` — the 4x4 grid sheet (4·working_resolution × 4·working_resolution)
- `walk.prompt.txt` — the prompt sent to the model (with all 16 keyframes inline)
- `walk.seed.txt` — the seed used

Frame ordering is left-to-right, top-to-bottom (frame 1 = top-left, frame 16 = bottom-right). Keyframe poses come from `scripts/lib/keyframes.py` (the script repeats the 4-pose cycle 4× to fill 16 cells). Working resolution comes from `assets/sprites.json`. Depends on the canonical reference task (`shadow-mage-02-ref`) completing first.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_spritesheet.py shadow-mage walk --seed N`.
