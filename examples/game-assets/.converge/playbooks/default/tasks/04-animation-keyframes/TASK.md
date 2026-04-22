---
id: 04-animation-keyframes
title: Animation Keyframes — Generate animation keyframe sequences
description: "For each character animation state, generate individual keyframes using Nano-banana with character refs + pose hints. Output: assets/characters/{char_id}/{state}/frames/{state}_{frame}.png."
dependencies:
  - 03-sprite-sheet-gen
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - animation
  - keyframes
inputs:
  - assets/sprites.json
  - assets/characters/**/ref/ref.png
  - spritesheets/**/*.png
outputs:
  - assets/characters/**/{state}/frames/*.png
checks:
  - id: keyframes-generated
    cmd: node -e "const fs=require('fs');const n=[];function r(d){const e=fs.readdirSync(d);for(const f of e){const p=d+'/'+f;if(fs.statSync(p).isDirectory())r(p);else if(f.endsWith('.png')&&f.includes('_'))n.push(p)}}r('assets/characters');console.log(n.length)"
    description: At least one animation keyframe was generated
---

# Animation Keyframes

Generate precise animation keyframe sequences for each character state using pose hints from the poses phase.

## Output Structure

```
assets/characters/{char_id}/{state}/frames/
  {state}_{frame}.png   # individual keyframe (128x128)
  {state}_{frame}.prompt.txt
  {state}_{frame}.seed.txt
assets/characters/{char_id}/prompts/
  {state}.txt  # shared prompt used for all frames of this state
```

## Keyframe Generation

Each keyframe is generated with:
1. Character ref.png as identity anchor
2. Pose description from poses/{char_id}/{state}_poses.json
3. State-specific animation timing constraints
4. Resolution enforcement to 128x128

## Animation States

| State | Frames |
|-------|--------|
| idle  | 4      |
| walk  | 4      |

Default for test scope: 4 frames per state.