---
id: gold-key-spritesheet-idle
title: Generate Ornate Golden Key With Gem Inset idle sprite sheet
description: Idle animation sprite sheet for Ornate Golden Key With Gem Inset
tags:
  - prop
  - item
  - spritesheet
outputs:
  - assets/objects/gold-key/spritesheets/idle/idle.png
  - assets/objects/gold-key/spritesheets/idle/idle.atlas.json
  - assets/objects/gold-key/spritesheets/idle/idle.prompt.txt
checks:
  - id: prop-spritesheet-png-exists-and-large
    description: "Prop sheet PNG exists with reasonable dimensions (>=512x256)"
    cmd: "python -c \"from PIL import Image; im=Image.open('assets/objects/gold-key/spritesheets/idle/idle.png'); w,h=im.size; assert w>=512 and h>=256, f'sheet too small: {im.size}'\"\n"
  - id: prop-atlas-json-matches-png
    description: "Prop atlas JSON's grid + sheet_size match the PNG (1x1 for static props, NxM for animated)"
    cmd: "python -c \"import json; from PIL import Image; a=json.load(open('assets/objects/gold-key/spritesheets/idle/idle.atlas.json')); im=Image.open('assets/objects/gold-key/spritesheets/idle/idle.png'); m=a['meta']; assert m['cols']>=1 and m['rows']>=1, f\\\"grid too small: {m}\\\"; assert len(a['frames'])==m['cols']*m['rows'], f\\\"frame count != cols*rows: {m}\\\"; assert m['sheet_size']['w']==im.size[0] and m['sheet_size']['h']==im.size[1], f\\\"atlas/sheet size mismatch: atlas={m['sheet_size']} png={im.size}\\\"\"\n"
  - id: prop-prompt-saved
    description: Sibling .prompt.txt exists for debugging
    cmd: test -s assets/objects/gold-key/spritesheets/idle/idle.prompt.txt
vars:
  obj_id: gold-key
  obj_name: Ornate Golden Key With Gem Inset
  obj_description: Ornate golden key with gem inset
  obj_category: item
  states: "[\"idle\"]"
  state_name: idle
  state_description: Idle animation sprite sheet for Ornate Golden Key With Gem Inset
---

# Ornate Golden Key With Gem Inset idle Sprite Sheet

Runs `scripts/generate_prop_spritesheet.py gold-key idle`. **One image-gen call** draws a 4x4 grid (16 frames) on one canvas, so the prop's identity stays consistent across frames.

Outputs land in `assets/objects/gold-key/spritesheets/idle/`:
- `idle.png` — the 4x4 grid sheet
- `idle.atlas.json` — Phaser/TexturePacker JSON-Hash atlas (frames + sheet meta)
- `idle.prompt.txt` — the prompt sent to the model
- `idle.seed.txt` — the seed used

Frame ordering is left-to-right, top-to-bottom (frame 1 = top-left, frame 16 = bottom-right). Keyframe poses come from `scripts/lib/keyframes.py` (4-pose cycle repeated 4× to fill 16 cells); for `state="idle"` the prop generator prefers the `prop_idle` keyframes if defined, falling back to the generic `idle` cycle.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_prop_spritesheet.py gold-key idle --seed N`.
