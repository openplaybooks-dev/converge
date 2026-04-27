---
title: Scene Layout
description: Deterministic placement of every character + prop on the arena → assets/scene.json.
wbs:
  type: shell
  path: scripts/build_scene.js
dependencies: [05-meshy-refine, 10-prop-pipeline]
outputs:
  - assets/scene.json
checks:
  - id: scene-has-placements
    cmd: |
      node -e "const s=require('./assets/scene.json');if(!Array.isArray(s.placements)||s.placements.length<1)process.exit(1)"
    description: scene.json has at least one placement
  - id: every-character-placed
    cmd: |
      node -e "const c=require('./assets/characters.json');const s=require('./assets/scene.json');for(const x of c)if(!s.placements.find(p=>p.asset_id===x.id))process.exit(1)"
    description: every character in characters.json appears in scene.json
tags: [scene, deterministic]
---

# Scene Layout

Pure layout — no AI. Re-running gives the same scene (deterministic).

Placement strategy:
- **Characters** in a row at z = -1.5, equally spaced, facing the camera.
- **Props** scattered in an outer ring (radius 6–11) using a Halton(2,3) low-discrepancy sequence so they don't bunch up. ~3× the prop count is placed (so 4 unique prop kinds → ~12 prop placements with rotation/scale variety).

The scene is small enough that orbit-camera viewing shows everything at once; large enough that the cast doesn't feel cramped on a flat plane.
