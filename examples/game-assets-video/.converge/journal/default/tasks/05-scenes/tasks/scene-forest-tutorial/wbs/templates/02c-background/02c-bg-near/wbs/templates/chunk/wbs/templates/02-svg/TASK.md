---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-chunk-{{chunk_ordinal}}-02-svg"
title: "Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}} — author chunk.svg"
description: "Agent writes a self-contained SVG sized to this chunk's pixel canvas, driven entirely by chunk-spec.json. No API call. The SVG encodes the binding silhouettes (ground polyline, props, hazards, platform footprints) that the painter must preserve."
inputs:
  - "assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk-spec.json"
outputs:
  - "assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk.svg"
checks:
  - id: chunk-svg-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk.svg
    description: chunk.svg was written
  - id: chunk-svg-canvas-matches-spec
    cmd: |
      python -c "
      import json, re
      base = 'assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}'
      spec = json.load(open(f'{base}/chunk-spec.json'))
      cv = spec['canvas']
      svg = open(f'{base}/chunk.svg', encoding='utf-8').read()
      m_w = re.search(r'\\bwidth=\"(\\d+)\"', svg)
      m_h = re.search(r'\\bheight=\"(\\d+)\"', svg)
      m_vb = re.search(r'viewBox=\"0 0 (\\d+) (\\d+)\"', svg)
      assert m_w and int(m_w.group(1)) == cv['width_px'], f'svg width must be {cv[\"width_px\"]}'
      assert m_h and int(m_h.group(1)) == cv['height_px'], f'svg height must be {cv[\"height_px\"]}'
      assert m_vb and m_vb.group(1) == str(cv['width_px']) and m_vb.group(2) == str(cv['height_px']), 'viewBox mismatch'
      "
    description: SVG canvas matches chunk-spec.canvas exactly
  - id: chunk-svg-ground-fill-first
    cmd: |
      python -c "
      import re
      svg = open('assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk.svg', encoding='utf-8').read()
      # Strip the chroma backdrop rect; first content element after it must be ground-fill.
      after_chroma = svg.split('data-kind=\"chroma-bg\"', 1)
      assert len(after_chroma) == 2, 'chroma-bg backdrop missing'
      tail = after_chroma[1]
      first = re.search(r'data-kind=\"([^\"]+)\"', tail)
      assert first and first.group(1) == 'ground-fill', f'first content element must be ground-fill, got {first and first.group(1)}'
      assert '#00FF00' in svg or '#00ff00' in svg, 'chroma green backdrop missing'
      "
    description: chroma backdrop precedes a ground-fill polygon as the first content element
  - id: chunk-svg-hazards-and-platforms-rendered
    cmd: |
      python -c "
      import json, re
      base = 'assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}'
      spec = json.load(open(f'{base}/chunk-spec.json'))
      svg = open(f'{base}/chunk.svg', encoding='utf-8').read()
      n_haz = len(re.findall(r'data-kind=\"hazard-marker\"', svg))
      n_plat = len(re.findall(r'data-kind=\"platform-base\"', svg))
      assert n_haz == len(spec['hazards']), f'expected {len(spec[\"hazards\"])} hazard-marker rects, got {n_haz}'
      assert n_plat == len(spec['platforms']), f'expected {len(spec[\"platforms\"])} platform-base rects, got {n_plat}'
      "
    description: every spec hazard and platform is rendered in the SVG (1:1)
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - chunk
  - svg
---

# Scene `{{scene_id}}` — bg-near chunk {{chunk_ordinal}} SVG

## Role

You are authoring the **chunk-local SVG skeleton**. **No paid API calls.** Read the
spec, write SVG XML, save to disk. Total context surface: one JSON file.

## What to do

1. Read `assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk-spec.json`.

2. Write the SVG to `assets/scenes/{{scene_id}}/bg-near/chunks/chunk-{{chunk_index_padded}}/chunk.svg`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" shape-rendering="geometricPrecision">
  <rect data-kind="chroma-bg" x="0" y="0" width="{W}" height="{H}" fill="#00FF00" />
  <!-- Ground-fill polygon: top edge follows spec.elevation polyline (chunk-local x),
       bottom edge runs along canvas bottom. THIS MUST BE THE FIRST CONTENT ELEMENT. -->
  <polygon data-kind="ground-fill"
           fill="{spec.palette.ground_fill}" stroke="{spec.palette.ground_stroke}" stroke-width="2"
           points="0,{baseline_local} ... {W},{baseline_local} {W},{H} 0,{H}" />
  <!-- 3-8 small foreground props above the polyline (grass-tuft / rock / tree-stump / flowers / dirt-clod / root / leaf-overhang).
       Use spec.props placements verbatim. -->
  <polygon data-kind="grass-tuft" fill="{spec.palette.foliage_fill}" points="..." />
  <rect    data-kind="rock" fill="{spec.palette.foliage_fill}" stroke="{spec.palette.foliage_stroke}" x="..." y="..." width="..." height="..." />
  <!-- One hazard-marker rect per spec.hazards entry, in spec order, at the spec's exact (x_px, y_px, w, h). -->
  <rect    data-kind="hazard-marker" fill="{spec.palette.accent}" x="..." y="..." width="32" height="16" />
  <!-- One platform-base rect per spec.platforms entry, exact coords. -->
  <rect    data-kind="platform-base" fill="{spec.palette.foliage_stroke}" x="..." y="..." width="..." height="12" />
</svg>
```

## Rules

- Canvas dimensions MUST be `spec.canvas.width_px × spec.canvas.height_px`. Both checks fail otherwise.
- Coordinates are **chunk-local** (x=0 at chunk's left edge).
- Convert each spec.elevation `(x_tile, y_tile)` to local pixels:
  - `x_local = x_tile * spec.tile_size_px - spec.x_px_range[0]`
  - `y_local = spec.baseline_px + (y_tile - reference_y_tile) * spec.tile_size_px`
    where `reference_y_tile` is the median elevation y_tile across this chunk (so the
    polyline undulates around the baseline rather than drifting up/down).
- The polyline MUST start at `x=0` and end at `x=spec.canvas.width_px` (extend with copies of the first/last sample if needed).
- The first content element (after `data-kind="chroma-bg"`) MUST be the `ground-fill` polygon.
- Render every spec hazard and platform exactly once, at the spec's `(x_px, y_px, w, h)` translated to local coords. The post-flight check counts these rects and fails if the count diverges.
- Above the polyline, place 3-8 foreground prop shapes (use `spec.props` if non-empty; otherwise place biome-appropriate decorative props per `spec.biome_variant` + `spec.ground_type`).
- Top 30% of canvas (`y < spec.canvas.height_px * 0.3`) MUST contain no element. The painter relies on that band being chroma so far + mid show through.
- All numeric attributes are integers.
- Use ONLY these `data-kind` values: `chroma-bg`, `ground-fill`, `grass-tuft`, `rock`,
  `tree-stump`, `flowers`, `dirt-clod`, `root`, `leaf-overhang`, `hazard-marker`,
  `platform-base`.
