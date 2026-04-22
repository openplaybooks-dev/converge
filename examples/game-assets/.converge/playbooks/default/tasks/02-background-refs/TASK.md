---
id: 02-background-refs
title: Background Reference Sheets — Locked environment layers
description: "Generate locked reference layers per background. Output: backgrounds/{id}/ref.png with parallax configuration."
dependencies:
  - 01-define-assets
wbs:
  type: nodejs
  path: ./wbs/index.js
tags:
  - background
  - reference
inputs:
  - idea.md
  - backgrounds.json
outputs:
  - backgrounds/**/*.png
  - backgrounds/**/*.ref.json
checks:
  - id: all-background-refs-locked
    cmd: node -e "const s=require('./backgrounds.json');const fs=require('fs');for(const x of s){if(!fs.existsSync('backgrounds/'+x.id+'/ref.png')){console.error('Missing ref for '+x.id);process.exit(1)}}"
    description: Every background has a locked ref.png
---

# Background Reference Sheets

Generate locked reference images for environmental parallax layers.

## Output Structure

```
backgrounds/{bg_id}/
  ref.png          # full resolution background
  ref.json         # { id, name, parallax_layer, resolution, description }
```

## Parallax Layers

- `far`: Distant mountains/clouds (slowest scroll)
- `mid`: Mid-ground elements
- `near`: Foreground elements (fastest scroll)