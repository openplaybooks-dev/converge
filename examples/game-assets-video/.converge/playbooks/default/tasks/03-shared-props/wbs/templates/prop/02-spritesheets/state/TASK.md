---
id: "{{obj_id}}-spritesheet-{{state_name}}"
title: "Generate {{obj_name}} {{state_name}} sprite sheet"
description: "{{state_description}}"
outputs:
  - "assets/objects/{{obj_id}}/spritesheets/{{state_name}}/{{state_name}}.png"
  - "assets/objects/{{obj_id}}/spritesheets/{{state_name}}/{{state_name}}.atlas.json"
  - "assets/objects/{{obj_id}}/spritesheets/{{state_name}}/{{state_name}}.prompt.txt"
checks:
  - id: prop-spritesheet-png-exists-and-large
    cmd: |
      python -c "from PIL import Image; im=Image.open('assets/objects/{{obj_id}}/spritesheets/{{state_name}}/{{state_name}}.png'); w,h=im.size; assert w>=512 and h>=256, f'sheet too small: {im.size}'"
    description: Prop sheet PNG exists with reasonable dimensions (>=512x256)
  - id: prop-atlas-json-matches-png
    cmd: |
      python -c "import json; from PIL import Image; a=json.load(open('assets/objects/{{obj_id}}/spritesheets/{{state_name}}/{{state_name}}.atlas.json')); im=Image.open('assets/objects/{{obj_id}}/spritesheets/{{state_name}}/{{state_name}}.png'); m=a['meta']; assert m['cols']>=1 and m['rows']>=1, f\"grid too small: {m}\"; assert len(a['frames'])==m['cols']*m['rows'], f\"frame count != cols*rows: {m}\"; assert m['sheet_size']['w']==im.size[0] and m['sheet_size']['h']==im.size[1], f\"atlas/sheet size mismatch: atlas={m['sheet_size']} png={im.size}\""
    description: Prop atlas JSON's grid + sheet_size match the PNG (1x1 for static props, NxM for animated)
  - id: prop-prompt-saved
    cmd: test -s assets/objects/{{obj_id}}/spritesheets/{{state_name}}/{{state_name}}.prompt.txt
    description: Sibling .prompt.txt exists for debugging
tags:
  - prop
  - "{{obj_category}}"
  - spritesheet
---

# {{obj_name}} {{state_name}} Sprite Sheet

Runs `scripts/generate_prop_spritesheet.py {{obj_id}} {{state_name}}`. **One image-gen call** draws a 4x4 grid (16 frames) on one canvas, so the prop's identity stays consistent across frames.

Outputs land in `assets/objects/{{obj_id}}/spritesheets/{{state_name}}/`:
- `{{state_name}}.png` — the 4x4 grid sheet
- `{{state_name}}.atlas.json` — Phaser/TexturePacker JSON-Hash atlas (frames + sheet meta)
- `{{state_name}}.prompt.txt` — the prompt sent to the model
- `{{state_name}}.seed.txt` — the seed used

Frame ordering is left-to-right, top-to-bottom (frame 1 = top-left, frame 16 = bottom-right). Keyframe poses come from `scripts/lib/keyframes.py` (4-pose cycle repeated 4× to fill 16 cells); for `state="idle"` the prop generator prefers the `prop_idle` keyframes if defined, falling back to the generic `idle` cycle.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_prop_spritesheet.py {{obj_id}} {{state_name}} --seed N`.
