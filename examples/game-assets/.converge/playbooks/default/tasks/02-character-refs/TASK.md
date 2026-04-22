---
id: 02-character-refs
title: Character Reference Sheets — Locked identity anchors
description: "Generate locked reference sheets per character. Output: assets/characters/{id}/ref/ref.png (locked identity anchor used in all downstream sprite generation)."
dependencies:
  - 01-define-assets
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - character
  - reference
  - locked
inputs:
  - idea.md
  - assets/sprites.json
outputs:
  - assets/characters/**/*.png
checks:
  - id: all-character-refs-locked
    cmd: node -e "const s=JSON.parse(require('fs').readFileSync('./assets/sprites.json','utf-8'));const fs=require('fs');for(const x of s){if(!fs.existsSync('assets/characters/'+x.id+'/ref/ref.png')){console.error('Missing ref for '+x.id);process.exit(1)}}"
    description: Every character has a locked ref.png
---

# Character Reference Sheets

Generate locked identity anchors for each character. These refs enforce consistency across all animation states and sprite sheets.

## Output Structure

```
assets/characters/{char_id}/
  ref/
    ref.png          # character reference (128x128)
  SPEC.md            # character specification
```

## Palette Enforcement

The ref must strictly follow the `palette` field from sprites.json.