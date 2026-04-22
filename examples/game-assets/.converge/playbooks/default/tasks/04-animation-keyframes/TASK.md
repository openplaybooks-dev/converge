---
id: 04-animation-keyframes
title: Animation Keyframes — Generate animation keyframe sequences
description: For each character animation state, generate a sequence of keyframes using compositing bridge with locked character refs + pose hints. Output: keyframes/{character_id}/{state}_{frame}.png for precise animation timing.
dependencies:
  - 03-sprite-sheet-gen
wbs:
  type: nodejs
  path: ./wbs/index.cjs
blocking: true
tags:
  - animation
  - keyframes
inputs:
  - sprites.json
  - spritesheets/**/{state}.png
  - characters/**/ref.png
outputs:
  - keyframes/**/*.png
checks:
  - id: keyframes-generated
    cmd: find keyframes -name '*.png' -type f | wc -l | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
    description: At least one animation keyframe was generated
---

# Animation Keyframes

Generate precise animation keyframe sequences for each character state. These keyframes can be used directly in game engines or as reference for interpolation.

## Output Structure

```
keyframes/{char_id}/{state}_{frame_index}.png
keyframes/{char_id}/{state}.keyframes.json  # timing metadata
```

## Keyframe Generation

Using the compositing bridge:
1. `composition.json` specifies pose + timing for each frame
2. `compose_preview.py` renders layout blueprint
3. `compose_blend.py` calls Nano-banana with refs + pose hints

## Animation Timing

| State | Total Frames | Keyframe Interval |
|-------|-------------|-------------------|
| idle  | 4           | every 1 frame     |
| walk  | 8           | every 2 frames    |
| attack| 6           | every 1 frame     |

Keyframes are at half-res (`sprite_resolution / 2`) for consistency with the compositing bridge.