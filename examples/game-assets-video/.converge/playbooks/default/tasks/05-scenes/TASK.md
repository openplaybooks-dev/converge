---
title: Scenes
description: For each entry in `assets/scenes.json`, run a complete per-scene asset pipeline (concept → background → tiles → props → manifest).
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies:
  - "04-registry-build"
inputs:
  - "assets/scenes.json"
tags:
  - scenes
  - generation
outputs: []
---

# 05-scenes — Scenes

The WBS spawns one full pipeline per scene declared in `assets/scenes.json`. Each scene generates its own concept image (anchor reference), then per-scene background / tiles / props / manifest using that concept as a secondary reference for every per-asset prompt.

This phase is the **biggest cost driver** for the playbook (multi-segment backgrounds dominate). See `vars.budget_cents` and the per-scene cost estimate in the playbook description.

Per-scene structure:
```
assets/scenes/{scene_id}/
├── concept.png + .prompt.txt + .seed.txt + SPEC.md
├── bg-far.png + bg-far.atlas.json
├── bg-mid.png + bg-mid.atlas.json
├── bg-near.png + bg-near.atlas.json
├── tilesheet/
│   ├── tiles/{tile_id}/{tile_id}.png
│   └── tilesheet.png + tilesheet.atlas.json
├── props/{scene_prop_id}/spritesheets/{state}/...
└── scene.json
```

Skipped if `vars.stop_after === "characters"`. (Set `stop_after: "sprites"` or `"export"` to include scenes.)
