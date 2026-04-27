---
id: "{{char_id}}-spritesheet-{{state_name}}"
title: "Generate {{char_name}} {{state_name}} sprite sheet"
description: "{{state_description}}"
outputs:
  - "assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.png"
  - "assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.atlas.json"
  - "assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.prompt.txt"
checks:
  - id: spritesheet-png-exists-and-large
    cmd: |
      python -c "from PIL import Image; im=Image.open('assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.png'); w,h=im.size; assert w>=512 and h>=256, f'sheet too small: {im.size}'"
    description: Sheet PNG exists and has reasonable dimensions (>=512x256)
  - id: atlas-json-matches-png
    cmd: |
      python -c "import json; from PIL import Image; a=json.load(open('assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.atlas.json')); im=Image.open('assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.png'); m=a['meta']; assert m['cols']>=2 and m['rows']>=1, f\"grid too small: {m}\"; assert len(a['frames'])==m['cols']*m['rows'], f\"frame count != cols*rows: {m}\"; assert m['sheet_size']['w']==im.size[0] and m['sheet_size']['h']==im.size[1], f\"atlas/sheet size mismatch: atlas={m['sheet_size']} png={im.size}\""
    description: Atlas JSON's grid + sheet_size match the PNG (auto-detected layout, not hardcoded 4x2)
  - id: prompt-saved
    cmd: test -s assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.prompt.txt
    description: Sibling .prompt.txt exists for debugging
tags:
  - character
  - animation
  - spritesheet
---

# {{char_name}} {{state_name}} Sprite Sheet

Runs `scripts/generate_spritesheet.py {{char_id}} {{state_name}}`. **One image-gen call** draws a 4-col × 2-row grid (8 frames) on a 1536×1024 canvas (gpt-image-1's native 3:2 size), so character identity stays consistent across frames.

Outputs land in `assets/characters/{{char_id}}/spritesheets/{{state_name}}/`:
- `{{state_name}}.png` — the 4×2 grid sheet, 1536×1024, with 384×512 cells
- `{{state_name}}.atlas.json` — frame coordinates (filename, x, y, w, h per frame) + sheet/grid meta, in Phaser/TexturePacker JSON-Hash style
- `{{state_name}}.prompt.txt` — the prompt sent to the model (with all 8 keyframes inline)
- `{{state_name}}.seed.txt` — the seed used

Frame ordering is left-to-right, top-to-bottom (frame 1 = top-left, frame 8 = bottom-right). Keyframe poses come from `scripts/lib/keyframes.py` — each state must define exactly 8 entries. Depends on the canonical reference task (`{{char_id}}-02-ref`) completing first.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_spritesheet.py {{char_id}} {{state_name}} --seed N`.
