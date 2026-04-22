---
id: 03-object-sheet-gen
title: Object Sheet Generation — Object variant sheets
description: "For each object, generate object sheets showing different states/variants. Output: objectsheets/{object_id}/{state}.png."
dependencies:
  - 02-object-refs
wbs:
  type: nodejs
  path: ./wbs/index.js
tags:
  - objectsheet
  - object
inputs:
  - objects.json
  - objects/**/ref.json
  - objects/**/ref.png
outputs:
  - objectsheets/**/*.png
checks:
  - id: object-sheets-generated
    cmd: "find objectsheets -name '*.png' -type f | wc -l | node -e \"process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)\""
    description: At least one object sheet was generated
---

# Object Sheet Generation

Generate variant sheets for objects showing different states (idle, collect, destroy, etc.).

## Output Structure

```
objectsheets/{obj_id}/{state}.png
```

## Object States

- `idle`: Default resting state
- `collect`: When player picks up (items)
- `destroy`: Breaking/dying animation
- `active`: In-use state (doors, switches)