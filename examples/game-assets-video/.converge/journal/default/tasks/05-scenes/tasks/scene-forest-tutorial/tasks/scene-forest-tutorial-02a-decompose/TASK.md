---
id: scene-forest-tutorial-02a-decompose
title: "Scene `forest-tutorial` — decompose to scene-plan.json"
description: Multi-modal text-out reads concept + extracted layers and writes the structured plan that drives every per-asset spec/generate call.
tags:
  - scene
  - forest-tutorial
  - decompose
  - planning
inputs:
  - assets/scenes/forest-tutorial/concept.png
  - assets/scenes/forest-tutorial/extracted/manifest.json
outputs:
  - assets/scenes/forest-tutorial/scene-plan.json
checks:
  - id: scene-plan-exists
    description: scene-plan.json was written
    cmd: test -s assets/scenes/forest-tutorial/scene-plan.json
  - id: scene-plan-has-layers-and-tiles
    description: scene-plan has bg.layers (each with regions) and tilesheet.tiles
    cmd: "python -c \"\nimport json\np = json.load(open('assets/scenes/forest-tutorial/scene-plan.json'))\nlayers = (p.get('bg') or {}).get('layers') or []\nassert layers, 'scene-plan.bg.layers empty'\nfor l in layers:\n    regs = l.get('regions') or []\n    assert regs, f'layer {l.get(\\\"id\\\")!r} has no regions'\ntiles = (p.get('tilesheet') or {}).get('tiles') or []\nassert tiles, 'scene-plan.tilesheet.tiles empty'\n\"\n"
vars:
  scene_id: forest-tutorial
  scene_name: Forest Tutorial
  scene_biome: grassland
  scene_description: "Open grassland tutorial scene with a winding dirt path, scattered trees and rocks, and a small water pond. The player picks up a gold key and a health potion while learning movement and pickup mechanics. Includes 2-3 small jumps, a water-pit hazard you must jump over, and one optional ledge with a hidden potion."
  bg_layers: "[{\"id\":\"far\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":1.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-far.png\",\"use_extraction\":true},{\"id\":\"mid\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":3.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-mid.png\",\"use_extraction\":true},{\"id\":\"near\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":6,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-near.png\",\"use_extraction\":true}]"
  tile_variant_ids: "[\"grass\",\"grass-flowers\",\"dirt\",\"path-corner-NE\",\"path-corner-NW\",\"path-corner-SE\",\"path-corner-SW\",\"water\",\"water-edge-grass\",\"tree-stump\",\"rock-small\"]"
  scene_prop_ids: "[]"
---

# Scene `forest-tutorial` — Decompose to scene-plan.json

Runs `python scripts/decompose_scene.py forest-tutorial`. Produces a
single structured JSON that bundles exactly the context every
downstream per-layer / per-tile / per-prop generator needs.

This is the **progressive-decomposition** core: instead of every
generation script re-deriving palette + adjacency + animation_type
from the raw scenes.json + style preset, all that work happens once
in this text-out task and gets written to `scene-plan.json`. Each
generator reads its slice and runs ONE focused image-gen call.

## Inputs (multimodal)

- `assets/concept/style-sheet.png` — universal style anchor
- `assets/scenes/forest-tutorial/concept.png` — scene anchor
- `assets/scenes/forest-tutorial/extracted/bg-{far,mid,near}.png` — slices
- `assets/scenes/forest-tutorial/scenes.json[scene]` entry
- `assets/catalog.json` — canonical prop animation_type

## Outputs

- `assets/scenes/forest-tutorial/scene-plan.json` — bg.layers[],
  tilesheet.tiles[] (with adjacency), scene_props[] (with
  animation_type + keyframes_id)
- `assets/scenes/forest-tutorial/scene-plan.raw.txt` — debug sidecar

## Cost

- 1 text-out call (~5¢ on Gemini)
