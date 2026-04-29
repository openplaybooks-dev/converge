---
id: scene-forest-tutorial-07-preview
title: "Scene `forest-tutorial` — composite preview"
description: "Pure compositing: paste bg layers + tiles + props + character into one preview.png for visual QA."
tags:
  - scene
  - forest-tutorial
  - preview
  - qa
inputs:
  - assets/scenes/forest-tutorial/scene.json
outputs:
  - assets/scenes/forest-tutorial/preview.png
checks:
  - id: scene-preview-exists
    description: preview.png was written and is not empty
    cmd: "python -c \"from pathlib import Path; p=Path('assets/scenes/forest-tutorial/preview.png'); assert p.exists() and p.stat().st_size > 1024, f'preview missing or empty: {p}'\"\n"
vars:
  scene_id: forest-tutorial
  scene_name: Forest Tutorial
  scene_biome: grassland
  scene_description: "Open grassland tutorial scene with a winding dirt path, scattered trees and rocks, and a small water pond. The player picks up a gold key and a health potion while learning movement and pickup mechanics. Includes 2-3 small jumps, a water-pit hazard you must jump over, and one optional ledge with a hidden potion."
  bg_layers: "[{\"id\":\"far\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":1.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-far.png\",\"use_extraction\":true},{\"id\":\"mid\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":3.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-mid.png\",\"use_extraction\":true},{\"id\":\"near\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":6,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-near.png\",\"use_extraction\":true}]"
  tile_variant_ids: "[\"grass\",\"grass-flowers\",\"dirt\",\"path-corner-NE\",\"path-corner-NW\",\"path-corner-SE\",\"path-corner-SW\",\"water\",\"water-edge-grass\",\"tree-stump\",\"rock-small\"]"
  scene_prop_ids: "[]"
---

# Scene `forest-tutorial` — Composite Preview

Runs `python scripts/build_scene_preview.py forest-tutorial`.

**No paid API call. Not a playable scene mock-up.** Just a labelled
sheet that lays every generated asset out side-by-side so the user can
confirm they exist, look stylistically coherent, and have correct
transparency before opening Phaser or Godot.

## Layout (top to bottom)

1. **BG STACK** — far + mid + near composited and tiled across the
   canvas width. Catches transparency failures (e.g. forest-near with
   solid blue) and palette clashes between layers.
2. **TILESHEET** — the whole tilesheet scaled to fit. Catches inconsistent
   per-tile palettes and edge mismatches.
3. **PROPS** — every prop's idle frame side-by-side with labels.
   Catches cross-prop style drift (3D metal vs cartoon vs painted).
4. **CHARACTERS** — every character's idle frame side-by-side. Catches
   character-vs-scene style mismatch.

Each row has a label band so the user knows what they're looking at.

## Cost

- 0¢ (no image-gen call)
