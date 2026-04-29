---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-chunk-{{chunk_ordinal}}-01-spec"
title: "Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}} — derive chunk-spec.json"
description: "Agent derives this chunk's localized spec from stage.json + scene-plan.json. No API call. Palette is inherited verbatim from the previous chunk's spec (chunk 0 picks from scene-plan.bg.layers[near].palette). Geometry is mechanically clipped from stage."
inputs:
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/scene-plan.json"
outputs:
  - "assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk-spec.json"
checks:
  - id: chunk-spec-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk-spec.json
    description: chunk-spec.json was written
  - id: chunk-spec-shape
    cmd: |
      python -c "
      import json
      s = json.load(open('assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk-spec.json'))
      stage = json.load(open('assets/scenes/{{scene_id}}/stage.json'))
      ts = stage['tile_size_px']
      x_lo, x_hi = {{chunk_x_lo_tile}}, {{chunk_x_hi_tile}}
      assert s['chunk_id'] == 'chunk-{{chunk_index_padded}}', f'chunk_id mismatch: {s.get(\"chunk_id\")}'
      assert s['x_tile_range'] == [x_lo, x_hi], f'x_tile_range mismatch: {s.get(\"x_tile_range\")}'
      assert s['x_px_range'] == [x_lo*ts, x_hi*ts], f'x_px_range mismatch: {s.get(\"x_px_range\")}'
      cv = s.get('canvas') or {{}}
      assert cv.get('width_px') == (x_hi-x_lo)*ts, f'canvas.width_px must be {(x_hi-x_lo)*ts}'
      assert cv.get('height_px') == stage['background']['target_height_px'], 'canvas.height_px must match stage'
      pal = s.get('palette') or {{}}
      for k in ('ground_fill','ground_stroke','foliage_fill','foliage_stroke','accent'):
          v = pal.get(k, '')
          assert isinstance(v, str) and v.startswith('#') and len(v) == 7, f'palette.{{k}} must be #RRGGBB; got {{v!r}}'
      # Geometry must be a subset of stage geometry inside this x range.
      stage_elev = {{(e['x_tile'], e['y_tile']) for e in stage.get('elevation') or []}}
      for sample in s.get('elevation') or []:
          assert (sample['x_tile'], sample['y_tile']) in stage_elev, f'elevation sample {sample} not in stage.elevation'
      assert s.get('baseline_px'), 'baseline_px required'
      assert s.get('tile_size_px') == ts, 'tile_size_px must match stage'
      "
    description: chunk-spec geometry is mechanically derived from stage (no fabricated samples)
  - id: chunk-spec-palette-inherited
    cmd: |
      python -c "
      import json, os
      idx = {{chunk_index}}
      if idx == 0:
          # Chunk 0 picks the palette; nothing to inherit from.
          raise SystemExit(0)
      prev = json.load(open(f'assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{idx-1:03d}/chunk-spec.json'))
      curr = json.load(open(f'assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{idx:03d}/chunk-spec.json'))
      assert prev['palette'] == curr['palette'], 'palette must be inherited verbatim from prev chunk to kill cross-chunk style drift'
      "
    description: for chunks N>0, palette is byte-for-byte equal to the previous chunk's palette
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - chunk
  - spec
---

# Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}} spec

## Role

You are deriving the **localized spec** for one bg-near chunk. **No paid API calls.**
You read the global geometry, clip it to this chunk's x-range, and write a single
JSON file. The downstream tasks (svg, render, paint) consume this spec only — they
never re-read `stage.json`.

## Why this exists

If every chunk re-derives geometry from the global `stage.json`, drift creeps in
(off-by-one tile boundaries, palette wobble, slightly-different prop placement).
By computing once here and freezing the result to disk, every downstream step works
from the same numbers. Constraint checks below verify the values match stage exactly.

## What to do

1. Read:
   - `assets/scenes/{{scene_id}}/stage.json`
   - `assets/scenes/{{scene_id}}/scene-plan.json`
   - For chunk index ≥ 1: `assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_prev_padded}}/chunk-spec.json` (the previous chunk's spec — palette source).
   - For chunk index 0: `assets/scenes/{{scene_id}}/extracted/bg-near.png` (visual palette anchor; read with the Read tool).

2. Clip stage geometry to this chunk's x-tile range `[{{chunk_x_lo_tile}}, {{chunk_x_hi_tile}}]`:
   - **elevation**: every `stage.elevation[i]` whose `x_tile` falls in `[lo, hi]` (inclusive).
   - **props**: every `stage.chunks[].scene_props[]` entry inside the range — but only ones whose `id` is NOT a hero/character id (foreground props only, not the player). Convert `(x_tiles, y_tiles)` to pixels.
   - **hazards**: `stage.hazards[]` entries with `x_tile` in `[lo, hi)`. Convert to pixel rects of width 32 height 16 sitting on the baseline.
   - **platforms**: `stage.platforms[]` entries whose `x_tiles` overlap the range. Convert to pixel rects (top at baseline, height 12).

3. Compute canvas + baseline:
   - `canvas.width_px  = (x_hi_tile - x_lo_tile) * stage.tile_size_px`
   - `canvas.height_px = stage.background.target_height_px`
   - `canvas.overlap_px = {{overlap_px}}` (carried forward from the WBS — used by the painter to know how much to inpaint).
   - `baseline_px = round(canvas.height_px * 0.65)` — foreground floor sits in the bottom ~35%.
   - `tile_size_px = stage.tile_size_px`

4. Pick or inherit palette (5 keys: `ground_fill`, `ground_stroke`, `foliage_fill`, `foliage_stroke`, `accent`):
   - **Chunk 0**: pick concrete `#RRGGBB` colors from `scene-plan.bg.layers[id="near"].palette` and the visual character of `extracted/bg-near.png`. These become the canonical scene palette.
   - **Chunk index ≥ 1**: copy the entire `palette` object verbatim from the previous chunk's spec. Do NOT modify any color value — the constraint check will compare byte-for-byte and fail if you do. (This is the lock that kills cross-chunk style drift.)

5. Write the spec to
   `assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk-spec.json`:

```json
{
  "chunk_id": "chunk-{{chunk_index_padded}}",
  "chunk_index": {{chunk_index}},
  "chunk_count": {{chunk_count}},
  "x_tile_range": [{{chunk_x_lo_tile}}, {{chunk_x_hi_tile}}],
  "x_px_range":   [<x_lo*tile_size_px>, <x_hi*tile_size_px>],
  "canvas":       {"width_px": <int>, "height_px": <int>, "overlap_px": {{overlap_px}}},
  "baseline_px":  <int>,
  "tile_size_px": <stage.tile_size_px>,
  "palette": {
    "ground_fill":   "#RRGGBB",
    "ground_stroke": "#RRGGBB",
    "foliage_fill":  "#RRGGBB",
    "foliage_stroke":"#RRGGBB",
    "accent":        "#RRGGBB"
  },
  "biome_variant": "<from stage.chunks overlapping this range>",
  "ground_type":   "<from stage.chunks overlapping this range>",
  "narrative":     "<from stage.chunks overlapping this range, joined>",
  "section_label": "{{section_label}}",
  "section_kind":  "{{section_kind}}",
  "elevation": [{"x_tile": <int>, "y_tile": <int>}, ...],
  "props":     [{"kind": "...", "x_px": <int>, "y_px": <int>, "w": <int>, "h": <int>}],
  "hazards":   [{"kind": "water|spike|...", "x_px": <int>, "y_px": <int>, "w": 32, "h": 16}],
  "platforms": [{"x_px": <int>, "y_px": <int>, "w": <int>, "h": 12}]
}
```

All numeric fields are integers. Coordinates are in **chunk-local pixels** (the SVG
canvas this spec drives is `canvas.width_px × canvas.height_px`, with `x=0` at the
chunk's left edge — convert: `x_local = x_global - x_lo_tile*tile_size_px`).

The post-flight checks verify dimensions, palette inheritance, and that elevation
samples are a subset of stage's. If any check fails, fix the spec — don't relax
the check.
