---
id: "{{char_id}}-spritesheet-{{state_name}}"
title: "Generate {{char_name}} {{state_name}} sprite sheet"
description: "{{state_description}}"
outputs:
  - "assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.png"
  - "assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.prompt.txt"
checks:
  - id: spritesheet-png-is-4x4-grid
    cmd: |
      python -c "from PIL import Image; im=Image.open('assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.png'); w,h=im.size; assert w==h, f'not square: {im.size}'; assert w>=256 and w%4==0, f'expected 4x4 grid (square, side>=256, divisible by 4): {im.size}'"
    description: Sheet is a square 4x4 grid (width == height, divisible by 4, >=256px)
  - id: prompt-saved
    cmd: test -s assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.prompt.txt
    description: Sibling .prompt.txt exists for debugging
tags:
  - character
  - animation
  - spritesheet
---

# {{char_name}} {{state_name}} Sprite Sheet

Runs `scripts/generate_spritesheet.py {{char_id}} {{state_name}}`. **One image-gen call** draws a 4x4 grid (16 frames) on one canvas, so character identity stays consistent across frames.

Outputs land in `assets/characters/{{char_id}}/spritesheets/{{state_name}}/`:
- `{{state_name}}.png` — the 4x4 grid sheet (4·working_resolution × 4·working_resolution)
- `{{state_name}}.prompt.txt` — the prompt sent to the model (with all 16 keyframes inline)
- `{{state_name}}.seed.txt` — the seed used

Frame ordering is left-to-right, top-to-bottom (frame 1 = top-left, frame 16 = bottom-right). Keyframe poses come from `scripts/lib/keyframes.py` (the script repeats the 4-pose cycle 4× to fill 16 cells). Working resolution comes from `assets/sprites.json`. Depends on the canonical reference task (`{{char_id}}-02-ref`) completing first.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_spritesheet.py {{char_id}} {{state_name}} --seed N`.
