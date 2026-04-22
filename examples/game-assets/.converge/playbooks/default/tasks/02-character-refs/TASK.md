---
id: 02-character-refs
title: Character Reference Sheets — Locked identity anchors
description: "Generate locked reference sheets per character (front/back/side views). Use compositing bridge with idea.md context + sprites.json spec + Nano-banana. Output: characters/{id}/ref.png (locked identity anchor used in all downstream sprite generation)."
dependencies:
  - 01-define-assets
wbs:
  type: nodejs
  path: ./wbs/index.js
executor:
  type: script
  path: ./scripts/generate_character_ref.py
  args:
    - "{{charId}}"
    - "{{charName}}"
    - "{{charDescription}}"
    - "{{charPalette}}"
  env:
    CONVERGE_OUTPUT_DIR: "characters/{{charId}}"
blocking: true
tags:
  - character
  - reference
  - locked
inputs:
  - idea.md
  - sprites.json
outputs:
  - characters/**/*.png
  - characters/**/*.ref.json
checks:
  - id: all-character-refs-locked
    cmd: node -e "const s=require('./sprites.json');const fs=require('fs');for(const x of s){if(!fs.existsSync('characters/'+x.id+'/ref.png')){console.error('Missing ref for '+x.id);process.exit(1)}}"
    description: Every character has a locked ref.png
---

# Character Reference Sheets

Generate locked identity anchors for each character. These refs enforce consistency across all animation states and sprite sheets.

## Pipeline

1. **Generate ref sheet** — one PNG containing front/back/side turnaround for the character
2. **Lock ref.json** — metadata file pointing to the ref.png with character specs

## Output Structure

```
characters/{char_id}/
  ref.png          # turnaround sheet (front/back/side)
  ref.json         # { id, name, palette, sprite_resolution, animation_states }
```

## Compositing Bridge

Use the same compositing pattern as cinematic-video-production:
- `composition.json` → `compose_preview.py` → `compose_blend.py`
- Blueprint shows layout of turnaround views
- Nano-banana renders the final ref sheet

## Palette Enforcement

The ref must strictly follow the `palette` field from sprites.json. Use negative prompts to exclude out-of-palette colors.