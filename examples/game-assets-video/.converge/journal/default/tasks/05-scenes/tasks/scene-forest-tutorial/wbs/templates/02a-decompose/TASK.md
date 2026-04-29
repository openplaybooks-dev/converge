---
id: "scene-{{scene_id}}-02a-decompose"
title: "Scene `{{scene_id}}` — decompose to scene-plan.json"
description: "Multi-modal text-out reads concept + extracted layers and writes the structured plan that drives every per-asset spec/generate call."
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/extracted/manifest.json"
outputs:
  - "assets/scenes/{{scene_id}}/scene-plan.json"
checks:
  - id: scene-plan-exists
    cmd: test -s assets/scenes/{{scene_id}}/scene-plan.json
    description: scene-plan.json was written
  - id: scene-plan-has-layers-and-tiles
    cmd: |
      python -c "
      import json
      p = json.load(open('assets/scenes/{{scene_id}}/scene-plan.json'))
      layers = (p.get('bg') or {}).get('layers') or []
      assert layers, 'scene-plan.bg.layers empty'
      for l in layers:
          regs = l.get('regions') or []
          assert regs, f'layer {l.get(\"id\")!r} has no regions'
      tiles = (p.get('tilesheet') or {}).get('tiles') or []
      assert tiles, 'scene-plan.tilesheet.tiles empty'
      "
    description: scene-plan has bg.layers (each with regions) and tilesheet.tiles
tags:
  - scene
  - "{{scene_id}}"
  - decompose
  - planning
---

# Scene `{{scene_id}}` — Decompose to scene-plan.json

Runs `python scripts/decompose_scene.py {{scene_id}}`. Produces a
single structured JSON that bundles exactly the context every
downstream per-layer / per-tile / per-prop generator needs.

This is the **progressive-decomposition** core: instead of every
generation script re-deriving palette + adjacency + animation_type
from the raw scenes.json + style preset, all that work happens once
in this text-out task and gets written to `scene-plan.json`. Each
generator reads its slice and runs ONE focused image-gen call.

## Inputs (multimodal)

- `assets/concept/style-sheet.png` — universal style anchor
- `assets/scenes/{{scene_id}}/concept.png` — scene anchor
- `assets/scenes/{{scene_id}}/extracted/bg-{far,mid,near}.png` — slices
- `assets/scenes/{{scene_id}}/scenes.json[scene]` entry
- `assets/catalog.json` — canonical prop animation_type

## Outputs

- `assets/scenes/{{scene_id}}/scene-plan.json` — bg.layers[],
  tilesheet.tiles[] (with adjacency), scene_props[] (with
  animation_type + keyframes_id)
- `assets/scenes/{{scene_id}}/scene-plan.raw.txt` — debug sidecar

## Cost

- 1 text-out call (~5¢ on Gemini)
