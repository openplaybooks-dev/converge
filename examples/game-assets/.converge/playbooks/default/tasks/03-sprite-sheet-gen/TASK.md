---
id: 03-sprite-sheet-gen
title: Sprite Sheet Assembly — Assemble keyframes into sprite sheets via Pillow
description: "For each character + animation_state, assemble keyframes into sprite sheets using Pillow. Keyframes are generated in task 04. Output: assets/characters/{char_id}/{state}/spritesheet.png."
dependencies:
  - 02-character-refs
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - spritesheet
  - character
  - animation
inputs:
  - assets/sprites.json
  - assets/global/templates/*.png
  - assets/characters/**/ref/ref.png
outputs:
  - assets/characters/**/{state}/spritesheet.png
checks:
  - id: spritesheets-generated
    cmd: node -e "const fs=require('fs');const n=[];function r(d){const e=fs.readdirSync(d);for(const f of e){const p=d+'/'+f;if(fs.statSync(p).isDirectory())r(p);else if(f==='spritesheet.png')n.push(p)}}r('assets/characters');console.log(n.length)"
    description: At least one sprite sheet was assembled
---

# Sprite Sheet Assembly

Assemble keyframes into sprite sheets for each character animation state.

## Output Structure

```
assets/characters/{char_id}/{state}/
  spritesheet.png   # assembled sprite sheet grid (256x256 for 4 frames)
```

## Sheet Layout

- 4 sprites per row
- Each frame is 128x128 pixels
- Total sheet size: 512x256 (4 frames at 128x128)
