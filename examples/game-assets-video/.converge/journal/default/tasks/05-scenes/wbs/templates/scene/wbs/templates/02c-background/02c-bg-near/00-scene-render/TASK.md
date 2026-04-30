---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-00-scene-render"
title: "Scene `{{scene_id}}` — render scene-skeleton.svg and slice into chunks"
description: "cairosvg rasterizes the whole-scene bg-near SVG, then slices into per-chunk skeleton PNGs (chunk.skeleton.png) and per-chunk spec JSONs (chunk-spec.json) at the x-ranges committed in scene-spec.json. Deterministic, no API calls. Replaces all per-chunk 01-spec / 02-svg / 03-render LLM-spawned sub-tasks."
inputs:
  - "assets/scenes/{{scene_id}}/bg-near/scene-skeleton.svg"
  - "assets/scenes/{{scene_id}}/bg-near/scene-spec.json"
  - "assets/scenes/{{scene_id}}/stage.json"
outputs:
  - "assets/scenes/{{scene_id}}/bg-near/scene-skeleton.png"
checks:
  - id: scene-skeleton-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/scene-skeleton.png
    description: full-scene PNG rasterized
  - id: per-chunk-skeletons-and-specs-written
    cmd: |
      python -c "
      import json
      from pathlib import Path
      spec = json.load(open('assets/scenes/{{scene_id}}/bg-near/scene-spec.json'))
      for ch in spec['chunks']:
          d = Path('assets/scenes/{{scene_id}}/bg-near/chunks') / ('chunk-' + str(ch['chunk_index']))
          for fn in ('chunk.skeleton.png', 'chunk-spec.json'):
              p = d / fn
              assert p.exists() and p.stat().st_size > 0, 'missing ' + str(p)
      "
    description: every chunk has chunk.skeleton.png + chunk-spec.json on disk
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - scene-render
---

# Scene `{{scene_id}}` — render the scene SVG into per-chunk skeletons

## Run

```bash
python scripts/render_scene_svg.py {{scene_id}}
```

The script:
1. Rasterizes `bg-near/scene-skeleton.svg` to `bg-near/scene-skeleton.png` at
   `stage.background.target_{width,height}_px`.
2. For each chunk in `bg-near/scene-spec.json[chunks]`:
   - Crops the full PNG to the chunk's `x_px_range` → `chunks/chunk-{N}/chunk.skeleton.png`.
   - Carves the chunk's `<g id="chunk-N">` from the SVG and writes a standalone
     `chunks/chunk-{N}/chunk.svg` (debug only — not used by the painter).
   - Writes a per-chunk `chunks/chunk-{N}/chunk-spec.json` with palette + slice
     metadata in CHUNK-LOCAL pixel coords (subtract x_lo from each `x_px`).

No LLM calls, no agent reasoning — pure deterministic transformation.
