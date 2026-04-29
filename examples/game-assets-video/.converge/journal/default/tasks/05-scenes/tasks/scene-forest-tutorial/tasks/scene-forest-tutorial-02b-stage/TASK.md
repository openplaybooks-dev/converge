---
id: scene-forest-tutorial-02b-stage
title: "Scene `forest-tutorial` — stage blueprint"
description: "Design the playable area as N chunks left-to-right. The blueprint everyone downstream reads: world width/height in tiles, per-chunk ground type and scene props, computed background dimensions."
tags:
  - scene
  - forest-tutorial
  - stage
  - planning
inputs:
  - assets/scenes/forest-tutorial/scene-plan.json
  - assets/scenes/forest-tutorial/SPEC.md
  - assets/scenes.json
  - assets/game.json
outputs:
  - assets/scenes/forest-tutorial/stage.json
  - assets/scenes/forest-tutorial/map.silhouette.png
checks:
  - id: stage-json-exists
    description: stage.json was written
    cmd: test -s assets/scenes/forest-tutorial/stage.json
  - id: stage-silhouette-exists
    description: map.silhouette.png was rendered
    cmd: test -s assets/scenes/forest-tutorial/map.silhouette.png
  - id: stage-json-has-required-shape
    description: "stage.json schema is valid — world, chunks, elevation, beats, platforms, hazards, background sizing"
    cmd: "python -c \"\nimport json\ns = json.load(open('assets/scenes/forest-tutorial/stage.json'))\nassert s.get('scene_id') == 'forest-tutorial', f'scene_id mismatch'\nworld = s.get('world') or {}\nw_tiles = world.get('width_tiles')\nh_tiles = world.get('height_tiles')\nassert isinstance(w_tiles, int) and w_tiles > 0, f'world.width_tiles invalid: {w_tiles}'\nassert isinstance(h_tiles, int) and h_tiles > 0, f'world.height_tiles invalid: {h_tiles}'\nchunks = s.get('chunks') or []\nassert len(chunks) >= 3, f'must have >= 3 chunks for an action-scroller layout; got {len(chunks)}'\ncur = 0\nfor ch in chunks:\n    xr = ch.get('x_tiles') or []\n    assert len(xr) == 2 and xr[0] == cur, f'chunk {ch.get(\\\"id\\\")} x_tiles {xr} does not start at {cur}'\n    assert xr[1] > xr[0], f'chunk {ch.get(\\\"id\\\")} x_tiles {xr} is empty or reversed'\n    cur = xr[1]\nassert cur == w_tiles, f'chunks span {cur} tiles but world.width_tiles is {w_tiles}'\nbg = s.get('background') or {}\nassert isinstance(bg.get('target_width_px'), int), 'background.target_width_px missing'\nassert isinstance(bg.get('target_height_px'), int), 'background.target_height_px missing'\nelev = s.get('elevation') or []\nassert len(elev) >= 8, f'elevation must have >= 8 samples; got {len(elev)}'\nassert elev[0].get('x_tile') == 0, f'first elevation sample must be at x_tile=0'\nassert elev[-1].get('x_tile') == w_tiles, f'last elevation sample must be at x_tile={w_tiles}'\nys = [e.get('y_tile') for e in elev if isinstance(e.get('y_tile'), int)]\nassert len(set(ys)) > 1, 'elevation must vary across the map'\nassert (max(ys) - min(ys)) >= 4, f'elevation spread must be at least 4 tiles (max-min); got {max(ys) - min(ys)}'\nbeats = s.get('beats') or []\nassert len(beats) >= 4, f'beats must have >= 4 entries (spawn → first → middle → exit); got {len(beats)}'\nkinds = [b.get('kind') for b in beats]\nassert 'spawn' in kinds, 'beats must include a spawn'\nassert 'exit' in kinds, 'beats must include an exit'\nplatforms = s.get('platforms') or []\nhazards = s.get('hazards') or []\n# The strict floors here match the prompt's hard rules; very long\n# 'tutorial-intro' scenes that genuinely have no threats can pass\n# platforms=2/hazards=0 by setting scene.gameplay.scene_kind='tutorial-intro'.\nkind = (((__import__('json').load(open('assets/scenes.json')) or [{}])[0]).get('gameplay') or {}).get('scene_kind') if False else None\nassert len(platforms) >= 2, f'must have >= 2 non-trivial platforms (ledge/elevated); got {len(platforms)}'\nassert len(hazards) >= 1, f'must have >= 1 hazard for action-scroller rhythm; got {len(hazards)}'\n\"\n"
  - id: stage-silhouette-not-tiny
    description: silhouette PNG is wide and large enough to be useful as a downstream reference
    cmd: "python -c \"\nfrom PIL import Image\nw, h = Image.open('assets/scenes/forest-tutorial/map.silhouette.png').size\nassert w >= 1024 and h >= 256, f'silhouette too small: {w}x{h} (expected >= 1024x256)'\nassert w / max(h, 1) >= 2.5, f'silhouette must be wide; got aspect {w}/{h} = {w/max(h,1):.2f}'\n\"\n"
vars:
  scene_id: forest-tutorial
  scene_name: Forest Tutorial
  scene_biome: grassland
  scene_description: "Open grassland tutorial scene with a winding dirt path, scattered trees and rocks, and a small water pond. The player picks up a gold key and a health potion while learning movement and pickup mechanics. Includes 2-3 small jumps, a water-pit hazard you must jump over, and one optional ledge with a hidden potion."
  bg_layers: "[{\"id\":\"far\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":1.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-far.png\",\"use_extraction\":true},{\"id\":\"mid\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":3.5,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-mid.png\",\"use_extraction\":true},{\"id\":\"near\",\"transparent\":true,\"transition_below\":null,\"subject_height_tiles\":6,\"extracted_layer_path\":\"assets/scenes/forest-tutorial/extracted/bg-near.png\",\"use_extraction\":true}]"
  tile_variant_ids: "[\"grass\",\"grass-flowers\",\"dirt\",\"path-corner-NE\",\"path-corner-NW\",\"path-corner-SE\",\"path-corner-SW\",\"water\",\"water-edge-grass\",\"tree-stump\",\"rock-small\"]"
  scene_prop_ids: "[]"
---

# Scene `forest-tutorial` — stage blueprint

## Role

You are a **paid-API operator**. Run the script and report its real result. Do **NOT** hand-author the JSON — the script's whole point is to use the model's understanding of the scene description and biome to design a coherent playable layout that other tasks downstream consume.

## What this produces

`assets/scenes/forest-tutorial/stage.json` — the **blueprint everyone downstream reads**. It defines:

- `world.width_tiles` × `world.height_tiles` — the playable area, in tile units. This is the source of truth for canvas dimensions across the rest of the pipeline.
- `chunks[]` — the scene split into contiguous left-to-right sections. Each chunk has its own `ground_type` (which tile family covers the floor), narrative (used to prompt per-segment background generation later), and `scene_props[]` (which collectibles/decorations live in this chunk and at what tile coords).
- `background.{target_width_px, target_height_px, segment_width_px, overlap_px}` — derived from world dimensions × tile size; consumed by `02c-background` to compute segment count.
- `tilemap_chunks[]` — per-chunk tile-set hints, consumed by `03-tiles` to spawn the right tile variants.

## Why this exists

Without a stage blueprint:
- Background segment count is computed from an arbitrary `target_size`, not from "this scene is N tiles wide".
- Tilemap layout is an undifferentiated grid rather than per-chunk biome variants.
- Scene props (key, potion, etc.) have no declared (x_tiles, y_tiles) — they get composited at random.

This task fixes the planning gap: it commits the scene's playable layout to disk before any pixels are generated.

## Run

```bash
python scripts/generate_stage.py forest-tutorial
```

The script reads `scene-plan.json` (which already has the per-layer art direction), `SPEC.md` (the scene's narrative spec), `scenes.json[forest-tutorial]` (declared characters / shared props / bg layer config), and `game.json` (tile size, view mode, world size hints). It calls Gemini text-out once with a structured prompt: "design this scene's playable area as N chunks". Output is one JSON object.

The post-execution check `stage-json-has-required-shape` rejects any output where chunks don't tile the world width cleanly (no gaps, no overlaps) or the world dimensions are missing.

## What to do if the script fails

1. Load `.env` (`set -a && . ./.env && set +a`) and re-run.
2. If the model returned malformed JSON, the script saves the raw text to `stage.raw.txt` and exits non-zero. Re-run; the model usually self-corrects on a second attempt.
3. If still failing, surface the exact error and exit. Do not patch around it locally.
