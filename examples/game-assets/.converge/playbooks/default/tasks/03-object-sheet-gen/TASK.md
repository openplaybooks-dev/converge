---
id: 03-object-sheet-gen
title: Object Sheet Generation — Object variant sheets
description: "For each object, generate object sheets showing different states/variants. Output: assets/objects/{object_id}/{state}/spritesheet.png."
dependencies:
  - 02-object-refs
wbs:
  type: nodejs
  path: ./wbs/index.js
tags:
  - objectsheet
  - object
inputs:
  - assets/objects.json
  - assets/objects/**/ref/ref.png
outputs:
  - assets/objects/**/{state}/spritesheet.png
checks:
  - id: object-sheets-generated
    cmd: node -e "const fs=require('fs');const n=[];function r(d){const e=fs.readdirSync(d);for(const f of e){const p=d+'/'+f;if(fs.statSync(p).isDirectory())r(p);else if(f==='spritesheet.png')n.push(p)}}r('assets/objects');console.log(n.length)"
    description: At least one object sheet was generated
---

# Object Sheet Generation

Generate variant sheets for objects showing different states (idle, collect, destroy, etc.).

## Output Structure

```
assets/objects/{obj_id}/{state}/
  spritesheet.png   # object state sprite sheet
```

## Object States

- `idle`: Default resting state
- `collect`: When player picks up (items)
- `destroy`: Breaking/dying animation
- `active`: In-use state (doors, switches)