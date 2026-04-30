---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-00-scene-svg"
title: "Scene `{{scene_id}}` — author whole-scene bg-near SVG"
description: "Read stage geometry + scene narrative + biome catalog and write a SINGLE wide SVG that covers the entire scene's bg-near foreground at full canvas dims (e.g. 3904×960). The SVG is the human-readable visual spec for the whole scene — open it directly to see the foreground design end-to-end. No paid API calls; the agent reasons once and writes one file. The downstream renderer slices the SVG into per-chunk skeleton PNGs deterministically."
inputs:
  - "assets/scenes/{{scene_id}}/SPEC.md"
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/extracted/bg-near.png"
  - ".converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02c-background/02c-bg-near/foreground-props-catalog.json"
outputs:
  - "assets/scenes/{{scene_id}}/bg-near/scene-skeleton.svg"
  - "assets/scenes/{{scene_id}}/bg-near/scene-spec.json"
checks:
  - id: scene-skeleton-svg-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/scene-skeleton.svg
    description: scene-skeleton.svg was written
  - id: scene-spec-json-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/scene-spec.json
    description: scene-spec.json was written
  - id: scene-skeleton-svg-canvas-matches-stage
    cmd: |
      python -c "
      import json, re
      stage = json.load(open('assets/scenes/{{scene_id}}/stage.json'))
      bg = stage['background']
      tw, th = bg['target_width_px'], bg['target_height_px']
      svg = open('assets/scenes/{{scene_id}}/bg-near/scene-skeleton.svg', encoding='utf-8').read()
      assert '<svg' in svg, 'not an SVG file'
      m_w = re.search(r'\\bwidth=\"(\\d+)\"', svg)
      m_h = re.search(r'\\bheight=\"(\\d+)\"', svg)
      assert m_w and int(m_w.group(1)) == tw, 'svg width must be ' + str(tw)
      assert m_h and int(m_h.group(1)) == th, 'svg height must be ' + str(th)
      assert '#00FF00' in svg or '#00ff00' in svg, 'svg must contain a #00FF00 chroma backdrop'
      "
    description: SVG canvas matches stage.background.target_{width,height}_px and includes chroma backdrop
  - id: scene-skeleton-svg-has-chunk-groups
    cmd: |
      python -c "
      import json, re
      stage = json.load(open('assets/scenes/{{scene_id}}/stage.json'))
      n = len(stage['chunks'])
      svg = open('assets/scenes/{{scene_id}}/bg-near/scene-skeleton.svg', encoding='utf-8').read()
      groups = re.findall(r'<g[^>]*\\bid=\"chunk-\\d+\"', svg)
      assert len(groups) >= n, 'svg must have >= ' + str(n) + ' <g id=\"chunk-NNN\"> groups; got ' + str(len(groups))
      "
    description: SVG has one <g id="chunk-NNN"> per stage chunk for slicing
  - id: scene-spec-json-shape
    cmd: |
      python -c "
      import json
      s = json.load(open('assets/scenes/{{scene_id}}/bg-near/scene-spec.json'))
      stage = json.load(open('assets/scenes/{{scene_id}}/stage.json'))
      assert s.get('scene_id') == '{{scene_id}}'
      cv = s.get('canvas') or {}
      assert cv.get('width_px') == stage['background']['target_width_px']
      assert cv.get('height_px') == stage['background']['target_height_px']
      pal = s.get('palette') or {}
      for k in ('ground_fill','ground_stroke','foliage_fill','foliage_stroke','accent'):
          v = pal.get(k, '')
          assert isinstance(v, str) and v.startswith('#') and len(v) == 7, 'palette.' + k + ' must be #RRGGBB'
      chunks = s.get('chunks') or []
      assert len(chunks) == len(stage['chunks']), 'one entry per stage chunk'
      for i, c in enumerate(chunks):
          assert c.get('chunk_index') == i
          assert c.get('x_tile_range') == stage['chunks'][i]['x_tiles']
      "
    description: scene-spec.json has scene_id, canvas, palette, and one chunk entry per stage chunk
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - scene-svg
---

# Scene `{{scene_id}}` — author whole-scene bg-near SVG

## Role

You are designing the **entire foreground-edge layer** for this scene as ONE wide
SVG file. **No paid API calls.** You read the inputs, reason about the whole
scene's foreground composition once, and write two files:

1. `assets/scenes/{{scene_id}}/bg-near/scene-skeleton.svg` — one SVG covering the
   full canvas (`stage.background.target_width_px × target_height_px`), with all
   chunks laid out side-by-side in one document. Open this file in any browser
   or SVG viewer to see the entire scene's foreground at a glance — it IS the
   visual spec.

2. `assets/scenes/{{scene_id}}/bg-near/scene-spec.json` — companion structured
   data: the canonical palette, per-chunk metadata (x ranges, biome variant,
   ground type, narrative, elevation samples, prop instances, hazard footprints,
   platform footprints). Downstream tools slice this without re-reasoning.

## Why one big SVG instead of one per chunk

Per-chunk specs drift: each chunk gets a different palette, props don't visually
relate across boundaries, and the eye sees the stitched result as a quilt of
inconsistent designs. A single scene-wide SVG forces one coherent vision —
palette is picked once, props feel placed by one designer, the ground line flows
naturally from spawn to exit. Downstream chunk tasks just slice this document.

## Inputs

- `SPEC.md` — scene narrative.
- `stage.json` — geometry source of truth: `world.{width_tiles, height_tiles}`,
  `tile_size_px`, `background.{target_width_px, target_height_px}`,
  `chunks[]` (each with `x_tiles`, `biome_variant`, `ground_type`,
  `elevation_range`, `narrative`, `scene_props[]`), `elevation[]`, `beats[]`,
  `platforms[]`, `hazards[]`.
- `scene-plan.json` — `bg.layers[id="near"].palette` + per-region prose.
- `extracted/bg-near.png` — visual palette / silhouette anchor (read with the
  Read tool).
- `foreground-props-catalog.json` — per-biome prop kind menus + size buckets +
  fixed-size game-mechanic markers.

## Output 1 — `scene-skeleton.svg`

Single SVG, full scene canvas. Structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{TW}" height="{TH}"
     viewBox="0 0 {TW} {TH}"
     shape-rendering="geometricPrecision">

  <!-- 1. Chroma backdrop — REQUIRED, full canvas -->
  <rect data-kind="chroma-bg" x="0" y="0" width="{TW}" height="{TH}" fill="#00FF00" />

  <!-- 2. Continuous ground polyline spanning the whole scene -->
  <!-- One <polygon data-kind="ground-fill"> with the ENTIRE elevation curve as
       its top edge. Bottom = canvas bottom. This is one connected mass; chunks
       only differ by what's above the ground line, not by separate ground pieces. -->
  <polygon data-kind="ground-fill"
           fill="{palette.ground_fill}" stroke="{palette.ground_stroke}" stroke-width="2"
           points="0,{ground_y_at_x=0} ... {TW},{ground_y_at_x=TW} {TW},{TH} 0,{TH}" />

  <!-- 3. One <g id="chunk-NNN"> per stage chunk, holding the chunk's props,
       hazards, platforms. Groups are non-overlapping and tile the canvas. -->
  <g id="chunk-000" data-x-px-range="0,480" data-section-label="player-start → first-small-rise">
    <!-- 3-8 props above the ground line -->
    <polygon data-kind="grass-tuft" fill="..." points="..." />
    <rect    data-kind="rock"       fill="..." x="..." y="..." width="..." height="..." />
    <!-- hazard markers -->
    <rect    data-kind="hazard-marker" fill="{palette.accent}" x="..." y="..." width="96" height="48" />
    <!-- platform footprints -->
    <rect    data-kind="platform-base" fill="{palette.foliage_stroke}" x="..." y="..." width="..." height="32" />
  </g>

  <g id="chunk-001" data-x-px-range="480,800" ...> ... </g>
  ...
</svg>
```

## Hard rules for the SVG

- **Continuous ground polyline.** One `<polygon data-kind="ground-fill">` whose
  top edge is the full scene's elevation curve — sample `stage.elevation[]` at
  every x_tile, convert to canvas pixels, and emit the points. Do NOT split the
  ground polygon per chunk; the whole scene is one connected ground mass.
- **Ground baseline.** Convert `stage.elevation[i].y_tile` to canvas y using
  `y_canvas = baseline_px + (y_tile - reference_y_tile) * tile_size_px`, where
  `baseline_px = round(target_height_px * 0.50)` (NOT 0.65 — earlier versions
  put ground too low) and `reference_y_tile = median(stage.elevation[].y_tile)`.
- **One `<g id="chunk-NNN">` per stage chunk**, in stage order, padded to 3
  digits. Set `data-x-px-range="x_lo_px,x_hi_px"` from chunk `x_tiles * tile_size_px`.
- **Top 30% stays chroma.** No element placed at `y < 0.30 * target_height_px`.
- **Pick palette once.** Read `extracted/bg-near.png` and `scene-plan.bg.layers[near].palette`,
  pick 5 hex colors. The same palette is used in every chunk group's elements.
  This is THE canonical scene palette.
- **Props per chunk.** Per chunk: place 3-8 decorative props inside the
  chunk's x range, above the chunk's local ground curve, using sizes from
  `foreground-props-catalog.json` size_classes (tiny/small/medium/large/overhang)
  and kinds from the chunk's matched biome key. Match `chunk.biome_variant` →
  catalog biome key (case-insensitive prefix; fall back to `generic`).
- **Game-mechanic markers** use catalog `fixed_size_kinds`:
  - `hazard-marker`: 96×48, sitting on baseline at `(stage.hazards[i].x_tile * tile_size_px, baseline_px - 8)`.
  - `platform-base`: spans `stage.platforms[i].x_tiles`, height 32, top at baseline.
- **All numeric coordinates are integers.**
- **Continuous design.** Adjacent chunks should feel like one painting:
  vary prop kinds and densities so neighbors don't look identical, but use
  the SAME palette and SAME ground material throughout. The chunk boundaries
  should not be visually obvious in the SVG.

## Output 2 — `scene-spec.json`

Companion JSON that captures the data side of the SVG (downstream tools read
this instead of parsing SVG):

```json
{
  "scene_id": "{{scene_id}}",
  "canvas": {"width_px": <int>, "height_px": <int>, "tile_size_px": <int>, "baseline_px": <int>},
  "palette": {
    "ground_fill":   "#RRGGBB",
    "ground_stroke": "#RRGGBB",
    "foliage_fill":  "#RRGGBB",
    "foliage_stroke":"#RRGGBB",
    "accent":        "#RRGGBB"
  },
  "elevation": [{"x_tile": <int>, "y_tile": <int>}, ...],
  "chunks": [
    {
      "chunk_index": 0,
      "chunk_id": "chunk-0",
      "x_tile_range": [0, 30],
      "x_px_range": [0, 480],
      "section_label": "player-start → first-small-rise",
      "section_kind":  "spawn → platform-up",
      "biome_variant": "grassland-open",
      "biome_key":     "forest",
      "ground_type":   "grass",
      "narrative":     "...",
      "props":     [{"kind": "grass-tuft", "x_px": <int>, "y_px": <int>, "w": <int>, "h": <int>}],
      "hazards":   [{"kind": "water", "x_px": <int>, "y_px": <int>, "w": 96, "h": 48}],
      "platforms": [{"x_px": <int>, "y_px": <int>, "w": <int>, "h": 32}]
    }
    // ... one entry per stage chunk, in order
  ]
}
```

The `props`, `hazards`, `platforms` arrays must reflect the EXACT same
elements you placed in the SVG (same kind, same coords). Downstream chunk
tasks rely on this.

## Verification

After writing both files, the post-flight checks below verify:
- both files exist and are non-empty
- SVG canvas dims match stage
- one `<g id="chunk-NNN">` per stage chunk
- scene-spec.json has the expected shape and palette format

If any check fails, fix the file (don't relax the check).
