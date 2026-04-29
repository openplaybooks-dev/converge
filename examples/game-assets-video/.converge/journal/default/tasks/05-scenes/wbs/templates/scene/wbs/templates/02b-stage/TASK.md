---
id: "scene-{{scene_id}}-02b-stage"
title: "Scene `{{scene_id}}` — stage blueprint"
description: "Design the playable area as N chunks left-to-right. The blueprint everyone downstream reads: world width/height in tiles, per-chunk ground type and scene props, computed background dimensions."
inputs:
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/SPEC.md"
  - "assets/scenes.json"
  - "assets/game.json"
outputs:
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/map.silhouette.png"
checks:
  - id: stage-json-exists
    cmd: test -s assets/scenes/{{scene_id}}/stage.json
    description: stage.json was written
  - id: stage-silhouette-exists
    cmd: test -s assets/scenes/{{scene_id}}/map.silhouette.png
    description: map.silhouette.png was rendered
  - id: stage-json-has-required-shape
    cmd: |
      python -c "
      import json
      s = json.load(open('assets/scenes/{{scene_id}}/stage.json'))
      assert s.get('scene_id') == '{{scene_id}}', f'scene_id mismatch'
      world = s.get('world') or {}
      w_tiles = world.get('width_tiles')
      h_tiles = world.get('height_tiles')
      assert isinstance(w_tiles, int) and w_tiles > 0, f'world.width_tiles invalid: {w_tiles}'
      assert isinstance(h_tiles, int) and h_tiles > 0, f'world.height_tiles invalid: {h_tiles}'
      chunks = s.get('chunks') or []
      assert len(chunks) >= 3, f'must have >= 3 chunks for an action-scroller layout; got {len(chunks)}'
      cur = 0
      for ch in chunks:
          xr = ch.get('x_tiles') or []
          assert len(xr) == 2 and xr[0] == cur, f'chunk {ch.get(\"id\")} x_tiles {xr} does not start at {cur}'
          assert xr[1] > xr[0], f'chunk {ch.get(\"id\")} x_tiles {xr} is empty or reversed'
          cur = xr[1]
      assert cur == w_tiles, f'chunks span {cur} tiles but world.width_tiles is {w_tiles}'
      bg = s.get('background') or {}
      assert isinstance(bg.get('target_width_px'), int), 'background.target_width_px missing'
      assert isinstance(bg.get('target_height_px'), int), 'background.target_height_px missing'
      elev = s.get('elevation') or []
      assert len(elev) >= 8, f'elevation must have >= 8 samples; got {len(elev)}'
      assert elev[0].get('x_tile') == 0, f'first elevation sample must be at x_tile=0'
      assert elev[-1].get('x_tile') == w_tiles, f'last elevation sample must be at x_tile={w_tiles}'
      ys = [e.get('y_tile') for e in elev if isinstance(e.get('y_tile'), int)]
      assert len(set(ys)) > 1, 'elevation must vary across the map'
      assert (max(ys) - min(ys)) >= 4, f'elevation spread must be at least 4 tiles (max-min); got {max(ys) - min(ys)}'
      beats = s.get('beats') or []
      assert len(beats) >= 4, f'beats must have >= 4 entries (spawn → first → middle → exit); got {len(beats)}'
      kinds = [b.get('kind') for b in beats]
      assert 'spawn' in kinds, 'beats must include a spawn'
      assert 'exit' in kinds, 'beats must include an exit'
      platforms = s.get('platforms') or []
      hazards = s.get('hazards') or []
      # The strict floors here match the prompt's hard rules; very long
      # 'tutorial-intro' scenes that genuinely have no threats can pass
      # platforms=2/hazards=0 by setting scene.gameplay.scene_kind='tutorial-intro'.
      kind = (((__import__('json').load(open('assets/scenes.json')) or [{}])[0]).get('gameplay') or {}).get('scene_kind') if False else None
      assert len(platforms) >= 2, f'must have >= 2 non-trivial platforms (ledge/elevated); got {len(platforms)}'
      assert len(hazards) >= 1, f'must have >= 1 hazard for action-scroller rhythm; got {len(hazards)}'
      "
    description: stage.json schema is valid — world, chunks, elevation, beats, platforms, hazards, background sizing
  - id: stage-silhouette-not-tiny
    cmd: |
      python -c "
      from PIL import Image
      w, h = Image.open('assets/scenes/{{scene_id}}/map.silhouette.png').size
      assert w >= 1024 and h >= 256, f'silhouette too small: {w}x{h} (expected >= 1024x256)'
      assert w / max(h, 1) >= 2.5, f'silhouette must be wide; got aspect {w}/{h} = {w/max(h,1):.2f}'
      "
    description: silhouette PNG is wide and large enough to be useful as a downstream reference
tags:
  - scene
  - "{{scene_id}}"
  - stage
  - planning
---

# Scene `{{scene_id}}` — stage blueprint

## Role

You are a **paid-API operator**. Run the script and report its real result. Do **NOT** hand-author the JSON — the script's whole point is to use the model's understanding of the scene description and biome to design a coherent playable layout that other tasks downstream consume.

## What this produces

`assets/scenes/{{scene_id}}/stage.json` — the **blueprint everyone downstream reads**. It defines:

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
python scripts/generate_stage.py {{scene_id}}
```

The script reads `scene-plan.json` (which already has the per-layer art direction), `SPEC.md` (the scene's narrative spec), `scenes.json[{{scene_id}}]` (declared characters / shared props / bg layer config), and `game.json` (tile size, view mode, world size hints). It calls Gemini text-out once with a structured prompt: "design this scene's playable area as N chunks". Output is one JSON object.

The post-execution check `stage-json-has-required-shape` rejects any output where chunks don't tile the world width cleanly (no gaps, no overlaps) or the world dimensions are missing.

## What to do if the script fails

1. Load `.env` (`set -a && . ./.env && set +a`) and re-run.
2. If the model returned malformed JSON, the script saves the raw text to `stage.raw.txt` and exits non-zero. Re-run; the model usually self-corrects on a second attempt.
3. If still failing, surface the exact error and exit. Do not patch around it locally.
