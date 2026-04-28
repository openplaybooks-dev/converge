---
id: bounce-spring-spritesheet-bounce
title: Generate Coil Spring bounce sprite sheet
description: Bounce animation sprite sheet for Coil Spring
tags:
  - prop
  - interactive
  - spritesheet
outputs:
  - assets/objects/bounce-spring/spritesheets/bounce/bounce.png
  - assets/objects/bounce-spring/spritesheets/bounce/bounce.atlas.json
  - assets/objects/bounce-spring/spritesheets/bounce/bounce.prompt.txt
checks:
  - id: prop-spritesheet-png-exists-and-large
    description: "Prop sheet PNG exists with reasonable dimensions (>=512x256)"
    cmd: "python -c \"from PIL import Image; im=Image.open('assets/objects/bounce-spring/spritesheets/bounce/bounce.png'); w,h=im.size; assert w>=512 and h>=256, f'sheet too small: {im.size}'\"\n"
  - id: prop-atlas-json-matches-png
    description: "Prop atlas JSON's grid + sheet_size match the PNG (auto-detected layout)"
    cmd: "python -c \"import json; from PIL import Image; a=json.load(open('assets/objects/bounce-spring/spritesheets/bounce/bounce.atlas.json')); im=Image.open('assets/objects/bounce-spring/spritesheets/bounce/bounce.png'); m=a['meta']; assert m['cols']>=2 and m['rows']>=1, f\\\"grid too small: {m}\\\"; assert len(a['frames'])==m['cols']*m['rows'], f\\\"frame count != cols*rows: {m}\\\"; assert m['sheet_size']['w']==im.size[0] and m['sheet_size']['h']==im.size[1], f\\\"atlas/sheet size mismatch: atlas={m['sheet_size']} png={im.size}\\\"\"\n"
  - id: prop-prompt-saved
    description: Sibling .prompt.txt exists for debugging
    cmd: test -s assets/objects/bounce-spring/spritesheets/bounce/bounce.prompt.txt
vars:
  obj_id: bounce-spring
  obj_name: Coil Spring
  obj_description: Metal coil spring mounted to floor plate; compresses on contact then launches upward.
  obj_category: interactive
  states: "[\"idle\",\"bounce\"]"
  state_name: bounce
  state_description: Bounce animation sprite sheet for Coil Spring
---

# Coil Spring bounce Sprite Sheet

Runs `scripts/generate_prop_spritesheet.py bounce-spring bounce`. **One image-gen call** draws a 4x4 grid (16 frames) on one canvas, so the prop's identity stays consistent across frames.

Outputs land in `assets/objects/bounce-spring/spritesheets/bounce/`:
- `bounce.png` — the 4x4 grid sheet
- `bounce.atlas.json` — Phaser/TexturePacker JSON-Hash atlas (frames + sheet meta)
- `bounce.prompt.txt` — the prompt sent to the model
- `bounce.seed.txt` — the seed used

Frame ordering is left-to-right, top-to-bottom (frame 1 = top-left, frame 16 = bottom-right). Keyframe poses come from `scripts/lib/keyframes.py` (4-pose cycle repeated 4× to fill 16 cells); for `state="idle"` the prop generator prefers the `prop_idle` keyframes if defined, falling back to the generic `idle` cycle.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_prop_spritesheet.py bounce-spring bounce --seed N`.
