---
id: scene-forest-tutorial-01b-extract
title: "Scene `forest-tutorial` — extract parallax layers from concept"
description: "WBS container. Spawns four per-layer children (01b1-far, 01b2-mid, 01b3-near, 01b4-manifest). Each child is its own paid-API call with its own prompt, fitness check, and retry budget. Order enforced by inputs: far → mid → near → manifest."
tags:
  - scene
  - forest-tutorial
  - extract
  - container
inputs:
  - assets/scenes/forest-tutorial/concept.png
wbs:
  type: nodejs
  path: ./wbs/index.js
vars:
  scene_id: forest-tutorial
  scene_name: Forest Tutorial
  scene_biome: grassland
  scene_description: "Open grassland tutorial scene with a winding dirt path, scattered trees and rocks, and a small water pond. The player picks up a gold key and a health potion while learning movement and pickup mechanics. Includes 2-3 small jumps, a water-pit hazard you must jump over, and one optional ledge with a hidden potion."
  bg_layers: "[{\"id\":\"far\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":1.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-far.png\",\"use_extraction\":true},{\"id\":\"mid\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":3.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-mid.png\",\"use_extraction\":true},{\"id\":\"near\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":6,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-near.png\",\"use_extraction\":true}]"
  tile_variant_ids: "[\"grass\",\"grass-flowers\",\"dirt\",\"path-corner-NE\",\"path-corner-NW\",\"path-corner-SE\",\"path-corner-SW\",\"water\",\"water-edge-grass\",\"tree-stump\",\"rock-small\"]"
  scene_prop_ids: "[]"
---

# Scene `forest-tutorial` — Extract parallax layers (container)

This is a **container task** with four static children, each a dedicated paid-API call:

1. `01b1-far` — extract the FAR layer (back wall, fully opaque, no chroma-key, no transparency).
2. `01b2-mid` — extract the MID layer (silhouette band, chroma-keyed to alpha; waits on far for sibling-below palette anchor).
3. `01b3-near` — extract the NEAR layer (foreground edge, chroma-keyed to alpha; waits on mid for sibling-above palette anchor).
4. `01b4-manifest` — vision-pass JSON describing palette / subject heights / tiles visible per layer; merges back into `scenes.json[forest-tutorial].background.layers[]`.

Each child:
- Has its own dedicated script (no shared builder; prompts are literal strings).
- Has its own per-layer fitness check (far requires `>95% opaque pixels`; mid+near require irregular alpha — not band slices).
- Has its own retry budget independent of the others.
- Can be regenerated individually if the cross-layer composition validator flags it later.

Order is enforced by `inputs:` gates on each child — the runner serializes far → mid → near → manifest naturally.

## Why per-layer tasks (not one looping task)

The previous shape was a single task that looped through all three layers internally. That conflated three independent concerns and meant a failure of one layer's extraction would either re-run all three layers (waste cost) or get masked behind one shared retry counter. Splitting gives:

- **Per-layer cost accounting** — each task declares `cost_cents` independently.
- **Per-layer regen** — when the validator flags only mid, only mid re-runs.
- **Hand-written prompts** — each script's prompt is a literal string, no template substitution machinery.
- **Per-layer fitness checks** — far's "fully opaque" rule and mid/near's "irregular alpha" rule live in their respective TASK.md, not in shared script code.

This matches how production VFX matte/decomposition pipelines structure layer extraction: one tool per layer.
