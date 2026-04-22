---
id: 02-object-refs
title: Object Reference Sheets — Locked object/prop refs
description: "Generate locked reference sheets per object/prop. Output: objects/{id}/ref.png with ref.json metadata."
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
  - objects.json
outputs:
  - objects/**/*.png
  - objects/**/*.ref.json
checks:
  - id: all-object-refs-locked
    cmd: node -e "const s=require('./objects.json');const fs=require('fs');for(const x of s){if(!fs.existsSync('objects/'+x.id+'/ref.png')){console.error('Missing ref for '+x.id);process.exit(1)}}"
    description: Every object has a locked ref.png
---

# Object Reference Sheets

Generate locked reference images for items, props, and structures.

## Output Structure

```
objects/{obj_id}/
  ref.png          # reference image
  ref.json         # { id, name, type, states, palette }
```

## Object Types

- `item`: Collectible items (potions, coins, keys)
- `prop`: Scene props (crates, barrels, signs)
- `structure`: Large structures (doors, walls, trees)