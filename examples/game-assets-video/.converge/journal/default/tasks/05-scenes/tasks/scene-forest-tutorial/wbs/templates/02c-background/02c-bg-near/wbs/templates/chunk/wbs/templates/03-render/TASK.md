---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-chunk-{{chunk_ordinal}}-03-render"
title: "Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}} — render chunk.svg"
description: "Rasterize chunk.svg with cairosvg into chunk.skeleton.png at the chunk's pixel canvas size. Deterministic, no API calls."
inputs:
  - "assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk.svg"
  - "assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk-spec.json"
outputs:
  - "assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk.skeleton.png"
checks:
  - id: chunk-skeleton-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk.skeleton.png
    description: chunk.skeleton.png written
  - id: chunk-skeleton-png-dims
    cmd: |
      python -c "
      import json
      from PIL import Image
      base = 'assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}'
      spec = json.load(open(f'{base}/chunk-spec.json'))
      cv = spec['canvas']
      w, h = Image.open(f'{base}/chunk.skeleton.png').size
      assert w == cv['width_px'] and h == cv['height_px'], f'skeleton dims {w}x{h} != canvas {cv[\"width_px\"]}x{cv[\"height_px\"]}'
      "
    description: skeleton PNG dimensions match chunk-spec.canvas exactly
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - chunk
  - render
---

# Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}} render

## Run

```bash
python scripts/render_bg_near_chunk.py {{scene_id}} {{chunk_index}}
```

cairosvg rasterizes `chunks/chunk-{{chunk_index_padded}}/chunk.svg` to
`chunks/chunk-{{chunk_index_padded}}/chunk.skeleton.png` at exactly
`chunk-spec.canvas.{width_px,height_px}`. No API calls, no paint.
