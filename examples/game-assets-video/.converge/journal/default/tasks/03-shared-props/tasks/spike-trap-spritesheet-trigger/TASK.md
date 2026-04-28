---
id: spike-trap-spritesheet-trigger
title: Generate Floor Spikes trigger sprite sheet
description: Trigger animation sprite sheet for Floor Spikes
tags:
  - prop
  - hazard
  - spritesheet
outputs:
  - assets/objects/spike-trap/spritesheets/trigger/trigger.png
  - assets/objects/spike-trap/spritesheets/trigger/trigger.atlas.json
  - assets/objects/spike-trap/spritesheets/trigger/trigger.prompt.txt
checks:
  - id: prop-spritesheet-png-exists-and-large
    description: "Prop sheet PNG exists with reasonable dimensions (>=512x256)"
    cmd: "python -c \"from PIL import Image; im=Image.open('assets/objects/spike-trap/spritesheets/trigger/trigger.png'); w,h=im.size; assert w>=512 and h>=256, f'sheet too small: {im.size}'\"\n"
  - id: prop-atlas-json-matches-png
    description: "Prop atlas JSON's grid + sheet_size match the PNG (auto-detected layout)"
    cmd: "python -c \"import json; from PIL import Image; a=json.load(open('assets/objects/spike-trap/spritesheets/trigger/trigger.atlas.json')); im=Image.open('assets/objects/spike-trap/spritesheets/trigger/trigger.png'); m=a['meta']; assert m['cols']>=2 and m['rows']>=1, f\\\"grid too small: {m}\\\"; assert len(a['frames'])==m['cols']*m['rows'], f\\\"frame count != cols*rows: {m}\\\"; assert m['sheet_size']['w']==im.size[0] and m['sheet_size']['h']==im.size[1], f\\\"atlas/sheet size mismatch: atlas={m['sheet_size']} png={im.size}\\\"\"\n"
  - id: prop-prompt-saved
    description: Sibling .prompt.txt exists for debugging
    cmd: test -s assets/objects/spike-trap/spritesheets/trigger/trigger.prompt.txt
vars:
  obj_id: spike-trap
  obj_name: Floor Spikes
  obj_description: Iron spikes embedded in stone block; extends and retracts. Deadly to step on while extended.
  obj_category: hazard
  states: "[\"idle\",\"trigger\"]"
  state_name: trigger
  state_description: Trigger animation sprite sheet for Floor Spikes
---

# Floor Spikes trigger Sprite Sheet

Runs `scripts/generate_prop_spritesheet.py spike-trap trigger`. **One image-gen call** draws a 4x4 grid (16 frames) on one canvas, so the prop's identity stays consistent across frames.

Outputs land in `assets/objects/spike-trap/spritesheets/trigger/`:
- `trigger.png` — the 4x4 grid sheet
- `trigger.atlas.json` — Phaser/TexturePacker JSON-Hash atlas (frames + sheet meta)
- `trigger.prompt.txt` — the prompt sent to the model
- `trigger.seed.txt` — the seed used

Frame ordering is left-to-right, top-to-bottom (frame 1 = top-left, frame 16 = bottom-right). Keyframe poses come from `scripts/lib/keyframes.py` (4-pose cycle repeated 4× to fill 16 cells); for `state="idle"` the prop generator prefers the `prop_idle` keyframes if defined, falling back to the generic `idle` cycle.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_prop_spritesheet.py spike-trap trigger --seed N`.
