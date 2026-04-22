---
id: 02-object-refs
title: Object Reference Sheets — Locked object/prop refs
description: "Generate locked reference sheets per object/prop. Output: assets/objects/{id}/ref/ref.png."
dependencies:
  - 01-define-assets
wbs:
  type: nodejs
  path: ./wbs/index.js
tags:
  - object
  - reference
inputs:
  - idea.md
  - assets/objects.json
outputs:
  - assets/objects/**/*.png
checks:
  - id: all-object-refs-locked
    cmd: node -e "const s=JSON.parse(require('fs').readFileSync('./assets/objects.json','utf-8'));const fs=require('fs');for(const x of s){if(!fs.existsSync('assets/objects/'+x.id+'/ref/ref.png')){console.error('Missing ref for '+x.id);process.exit(1)}}"
    description: Every object has a locked ref.png
---

# Object Reference Sheets

Generate locked reference images for items, props, and structures.

## Output Structure

```
assets/objects/{obj_id}/
  ref/
    ref.png          # reference image (128x128)
  SPEC.md            # object specification
```

## Object Types

- `item`: Collectible items (potions, coins, keys)
- `prop`: Scene props (crates, barrels, signs)
- `structure`: Large structures (doors, walls, trees)