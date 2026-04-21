---
id: 07-keyframes
title: Keyframes — Start + End Frame per Shot via Compositing Bridge
description: For every shot, author a declarative composition.json for start AND end frames, render a PIL blueprint preview, then blend via Nano-banana into a photoreal keyframe. Two keyframes per shot bracket the clip's motion.
dependencies:
  - 06-storyboard
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - keyframe
  - composition
  - image
inputs:
  - shots.json
  - scenes/**/state.json
  - characters/**/ref.json
  - locations/**/ref.json
  - style-guide.md
  - palette.json
outputs:
  - compositions/**/*.json
  - compositions/**/*.preview.png
  - keyframes/**/start.png
  - keyframes/**/end.png
  - keyframes/**/*.prompt.txt
  - keyframes/**/*.seed.txt
checks:
  - id: at-least-one-start-frame
    cmd: find keyframes -name 'start.png' -type f | wc -l  | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
    description: At least one start keyframe rendered
  - id: every-shot-has-start
    cmd: node -e "const s=require('./shots.json');const fs=require('fs');for(const x of s){if(!fs.existsSync('keyframes/'+x.id+'/start.png')){console.error('Missing start for '+x.id);process.exit(1)}}"
    description: Every shot has a start keyframe
  - id: every-non-static-shot-has-end
    cmd: node -e "const s=require('./shots.json');const fs=require('fs');for(const x of s){const isStatic=x.camera_move==='static';if(!isStatic&&!fs.existsSync('keyframes/'+x.id+'/end.png')){console.error('Missing end for '+x.id);process.exit(1)}}"
    description: Every non-static shot has an end keyframe
---

# Keyframes — Compositing Bridge

Each shot gets **two** photoreal keyframes (start + end) that bracket the clip's motion. The video model then interpolates between them — far more deterministic than free-form img2vid.

Each keyframe is produced by a 3-step pipeline:

1. **01-author-composition** — write `compositions/{shot_id}/{start|end}.json`: a declarative scene graph placing locked elements (character wardrobe refs, location plate, props) at normalized positions with z-order, pose hints, and lighting notes. Schema: `schemas/composition.schema.json`.
2. **02-preview** — run `scripts/compose_preview.py` to flatten the composition into a blueprint PNG (Pillow pastes each element at its spec'd position). Serves as human-QA gate AND as the layout anchor fed to the blender.
3. **03-blend** — run `scripts/compose_blend.py` to call Nano-banana (Gemini 2.5 Flash Image) with `[blueprint, base plate, element refs]` + the blend prompt. Output: one photoreal frame.

Shots with `camera_move: "static"` and no element motion may skip the end frame — `02-generate` in the next phase treats missing end as "hold on start".

## Why this beats passing raw refs

Feeding Nano-banana a pre-composed blueprint is dramatically more controllable than asking it to figure out layout from an action description + a pile of refs. Positions, sizes, and z-order are now deterministic. Identity still comes from the element refs; layout now comes from Python, not prompt-hope.
