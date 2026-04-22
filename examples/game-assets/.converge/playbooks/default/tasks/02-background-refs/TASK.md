---
id: 02-background-refs
title: Background Reference Sheets — Locked environment layers
description: "Generate locked reference layers per background. Output: assets/backgrounds/{id}/ref/ref.png."
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
  - assets/backgrounds.json
outputs:
  - assets/backgrounds/**/*.png
checks:
  - id: all-background-refs-locked
    cmd: node -e "const s=JSON.parse(require('fs').readFileSync('./assets/backgrounds.json','utf-8'));const fs=require('fs');for(const x of s){if(!fs.existsSync('assets/backgrounds/'+x.id+'/ref/ref.png')){console.error('Missing ref for '+x.id);process.exit(1)}}"
    description: Every background has a locked ref.png
---

# Background Reference Sheets

Generate locked reference images for environmental parallax layers.

## Output Structure

```
assets/backgrounds/{bg_id}/
  ref/
    ref.png          # background reference image
  SPEC.md            # background specification
```

## Parallax Layers

- `far`: Distant mountains/clouds (slowest scroll)
- `mid`: Mid-ground elements
- `near`: Foreground elements (fastest scroll)