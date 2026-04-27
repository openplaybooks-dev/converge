---
id: hero-knight-spritesheet-idle
title: Generate Sir Aldric idle sprite sheet
description: Idle animation sprite sheet for Sir Aldric
tags:
  - character
  - animation
  - spritesheet
outputs:
  - assets/characters/hero-knight/spritesheets/idle/idle.png
  - assets/characters/hero-knight/spritesheets/idle/idle.prompt.txt
checks:
  - id: spritesheet-png-is-4x4-grid
    description: "Sheet is a square 4x4 grid (width == height, divisible by 4, >=256px)"
    cmd: "python -c \"from PIL import Image; im=Image.open('assets/characters/hero-knight/spritesheets/idle/idle.png'); w,h=im.size; assert w==h, f'not square: {im.size}'; assert w>=256 and w%4==0, f'expected 4x4 grid (square, side>=256, divisible by 4): {im.size}'\"\n"
  - id: prompt-saved
    description: Sibling .prompt.txt exists for debugging
    cmd: test -s assets/characters/hero-knight/spritesheets/idle/idle.prompt.txt
vars:
  char_id: hero-knight
  char_name: Sir Aldric
  char_description: "Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement."
  palette: "16-bit retro, blue and silver armor, red accent, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  state_name: idle
  state_description: Idle animation sprite sheet for Sir Aldric
---

# Sir Aldric idle Sprite Sheet

Runs `scripts/generate_spritesheet.py hero-knight idle`. **One image-gen call** draws a 4x4 grid (16 frames) on one canvas, so character identity stays consistent across frames.

Outputs land in `assets/characters/hero-knight/spritesheets/idle/`:
- `idle.png` — the 4x4 grid sheet (4·working_resolution × 4·working_resolution)
- `idle.prompt.txt` — the prompt sent to the model (with all 16 keyframes inline)
- `idle.seed.txt` — the seed used

Frame ordering is left-to-right, top-to-bottom (frame 1 = top-left, frame 16 = bottom-right). Keyframe poses come from `scripts/lib/keyframes.py` (the script repeats the 4-pose cycle 4× to fill 16 cells). Working resolution comes from `assets/sprites.json`. Depends on the canonical reference task (`hero-knight-02-ref`) completing first.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_spritesheet.py hero-knight idle --seed N`.
