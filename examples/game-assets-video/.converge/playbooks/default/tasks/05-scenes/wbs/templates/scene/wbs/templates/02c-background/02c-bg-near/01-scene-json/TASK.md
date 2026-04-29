---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-01-scene-json"
title: "Scene `{{scene_id}}` — author whole-scene bg-near visual spec (scene-spec.json)"
description: "Agent reads bg-near/SPEC.md (the design brief from 00-scene-md) and writes ONE structured JSON document encoding the entire bg-near visual layout at full canvas dims: canvas, palette, ground polyline samples, per-chunk prop instances (kind + position + size + fill). The JSON describes ONLY the bg-near layer — no items, no characters, no platforms, no hazards. Those layers are owned by 04-props / 06-characters / 03-tiles and have their own specs. NO API call."
inputs:
  - "assets/scenes/{{scene_id}}/bg-near/SPEC.md"
  - "assets/scenes/{{scene_id}}/stage.json"
outputs:
  - "assets/scenes/{{scene_id}}/bg-near/scene-spec.json"
checks:
  - id: scene-spec-json-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/scene-spec.json
    description: scene-spec.json was written
  - id: scene-spec-json-has-required-shape
    cmd: |
      python -c "
      import json
      s = json.load(open('assets/scenes/{{scene_id}}/bg-near/scene-spec.json'))
      assert s.get('scene_id') == '{{scene_id}}', 'scene_id mismatch'
      cv = s.get('canvas') or {}
      stage = json.load(open('assets/scenes/{{scene_id}}/stage.json'))
      assert cv.get('width_px') == stage['background']['target_width_px'], 'canvas.width_px must match stage'
      assert cv.get('height_px') == stage['background']['target_height_px'], 'canvas.height_px must match stage'
      pal = s.get('palette') or {}
      for k in ('ground_fill','ground_stroke','foliage_fill','foliage_stroke','wood','rock','accent_flower','chroma'):
          v = pal.get(k, '')
          assert isinstance(v, str) and v.startswith('#') and len(v) == 7, 'palette.' + k + ' must be #RRGGBB; got ' + repr(v)
      # Terrain (tilemap grid) lives in a separate file at
      # assets/scenes/<id>/terrain.json — NOT inlined in this JSON.
      # The bg-near JSON describes ONLY palette + chunks (biome metadata).
      assert 'terrain' not in s, 'terrain block must live in assets/scenes/{{scene_id}}/terrain.json, not in scene-spec.json'
      assert 'ground_polyline' not in s, 'ground_polyline is superseded by terrain.json grid; remove it from scene-spec.json'
      chunks = s.get('chunks') or []
      assert len(chunks) >= 3, 'must have >= 3 design chunks; got ' + str(len(chunks))
      ts = cv['tile_size_px']
      world_w_tiles = stage['world']['width_tiles']
      cur = 0
      for i, c in enumerate(chunks):
          assert c.get('chunk_index') == i, 'chunk_index mismatch at ' + str(i)
          xtr = c.get('x_tile_range') or []
          assert isinstance(xtr, list) and len(xtr) == 2, 'chunk ' + str(i) + ' x_tile_range must be [lo, hi]'
          assert xtr[0] == cur, 'chunk ' + str(i) + ' x_tile_range starts at ' + str(xtr[0]) + ', expected ' + str(cur) + ' (chunks must tile contiguously)'
          assert xtr[1] > xtr[0], 'chunk ' + str(i) + ' x_tile_range is empty or reversed'
          cur = xtr[1]
          xpr = c.get('x_px_range') or []
          assert xpr == [xtr[0]*ts, xtr[1]*ts], 'chunk ' + str(i) + ' x_px_range mismatch'
          props = c.get('props') or []
          assert len(props) >= 3, 'chunk ' + str(i) + ' must have >= 3 props; got ' + str(len(props))
          for p in props:
              shape = p.get('shape')
              if shape == 'ellipse':
                  required = ('kind','cx','cy','rx','ry','fill')
              elif shape == 'path':
                  required = ('kind','d','fill')
              else:
                  required = ('kind','x_px','y_px','w','h','fill')
              for k in required:
                  assert k in p, 'chunk ' + str(i) + ' prop kind=' + str(p.get('kind')) + ' missing key ' + k
      assert cur == world_w_tiles, 'chunks span ' + str(cur) + ' tiles but world.width_tiles is ' + str(world_w_tiles)
      "
    description: scene-spec.json has scene_id, canvas matching stage, palette (8 hex), no terrain block (lives in terrain.json), one chunk entry per stage chunk with >= 3 props each
  - id: scene-spec-json-uses-spec-palette
    cmd: |
      python -c "
      import json, re
      spec_md = open('assets/scenes/{{scene_id}}/bg-near/SPEC.md', encoding='utf-8').read()
      spec_json = json.load(open('assets/scenes/{{scene_id}}/bg-near/scene-spec.json'))
      md_hexes = set(h.upper() for h in re.findall(r'#[0-9a-fA-F]{6}', spec_md))
      json_hexes = set(v.upper() for v in (spec_json.get('palette') or {}).values() if isinstance(v, str) and v.startswith('#'))
      shared = md_hexes & json_hexes
      assert len(shared) >= 6, 'JSON palette must reuse >= 6 hex values from SPEC.md; shared=' + str(shared)
      "
    description: scene-spec.json palette overlaps SPEC.md palette (>= 6 shared hex values)
  - id: scene-spec-json-no-gameplay-markers
    cmd: |
      python -c "
      import json
      s = json.load(open('assets/scenes/{{scene_id}}/bg-near/scene-spec.json'))
      banned = {'hazard-marker', 'platform-base', 'health-potion', 'gold-key', 'silver-key', 'character', 'enemy', 'npc'}
      for i, c in enumerate(s.get('chunks') or []):
          assert 'leave_room_zones' not in c, 'chunk ' + str(i) + ' has leave_room_zones — bg-near JSON describes ONLY bg-near, no cross-layer leave-room zones'
          for p in c.get('props') or []:
              assert p['kind'] not in banned, 'chunk ' + str(i) + ' prop has banned kind ' + p['kind'] + ' (items / characters / gameplay markers belong to other layers)'
      "
    description: scene-spec.json contains no items, characters, or gameplay markers; no leave_room_zones (cross-layer concerns belong to other layer specs)
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - scene-json
---

# Scene `{{scene_id}}` — author whole-scene bg-near visual spec (JSON)

## Role

You are realizing the bg-near design brief (`bg-near/SPEC.md`) as one
**structured JSON document**. **No API call.** Read the brief, write the JSON.

JSON replaces the earlier SVG-based visual concept because:
- Agents author JSON more reliably than SVG XML.
- Validation is straightforward (key presence, hex format, count match).
- Downstream consumers (paint scripts, sprite-composite tools, renderers,
  game engines) parse JSON natively. SVG can be **deterministically derived
  from the JSON** when needed for visual inspection — but the JSON is the
  authoritative spec.

## What to read

1. `assets/scenes/{{scene_id}}/bg-near/SPEC.md` — the design brief (this is
   the SOURCE OF TRUTH; the JSON must reflect every section).
2. `assets/scenes/{{scene_id}}/stage.json` — only for canvas dimensions and
   verifying the per-chunk x_tile ranges and ground-polyline numbers.

## What to write

ONE JSON file at
`assets/scenes/{{scene_id}}/bg-near/scene-spec.json` with this schema:

```json
{
  "scene_id": "{{scene_id}}",
  "canvas": {
    "width_px":     <int>,
    "height_px":    <int>,
    "tile_size_px": <int>,
    "baseline_px":  <int>
  },
  "palette": {
    "ground_fill":   "#RRGGBB",
    "ground_stroke": "#RRGGBB",
    "foliage_fill":  "#RRGGBB",
    "foliage_stroke":"#RRGGBB",
    "wood":          "#RRGGBB",
    "rock":          "#RRGGBB",
    "accent_flower": "#RRGGBB",
    "chroma":        "#00FF00"
  },
  "chunks": [
    {
      "chunk_index": 0,
      "chunk_id": "chunk-0",
      "x_tile_range": [0, 30],
      "x_px_range":   [0, 480],
      "section_label": "player-start → first-small-rise",
      "biome_variant": "grassland-open",
      "biome_key":     "forest",
      "ground_type":   "grass",
      "narrative":     "...",
      "props": [
        {
          "kind":       "grass-tuft",
          "shape":      "triangle",
          "size_class": "small",
          "x_px":       40,
          "y_px":       416,
          "w":          70,
          "h":          64,
          "fill":       "#2E5530",
          "stroke":     "#1A3A1C",
          "stroke_width": 1,
          "points":     [[40, 480], [75, 416], [110, 480]]
        },
        {
          "kind":       "rock",
          "shape":      "rect",
          "size_class": "medium",
          "x_px":       380,
          "y_px":       488,
          "w":          80,
          "h":          56,
          "fill":       "#7A6F5A",
          "stroke":     "#1A3A1C",
          "stroke_width": 1,
          "rx":         4
        },
        {
          "kind":       "lily-pad",
          "shape":      "ellipse",
          "size_class": "small",
          "cx":         1268,
          "cy":         472,
          "rx":         28,
          "ry":         12,
          "fill":       "#2E5530",
          "stroke":     "#1A3A1C",
          "stroke_width": 1
        }
      ]
    }
    // ... one chunk entry per stage.chunks[i], in order
  ]
}
```

## Hard rules

- **`scene_id`** matches the scene id verbatim.
- **`canvas.width_px / height_px`** match `stage.background.target_{width,height}_px`.
- **`canvas.baseline_px`** = `round(height_px * 0.50)` (per SPEC.md).
- **`palette`** has exactly the eight keys above; values are `#RRGGBB`
  hex strings; all eight must come from SPEC.md Section 2.
- **Terrain layout lives in a SEPARATE file** at
  `assets/scenes/{{scene_id}}/terrain.json`, NOT in this scene-spec.json.
  Build it with `python scripts/build_terrain_block_from_stage.py {{scene_id}}`
  (the adapter reads stage.json's elevation/platforms/hazards and writes
  the tilemap grid). The concept generator reads both files; this JSON
  must NOT contain a `terrain` field.
- **`chunks`**: one entry per `stage.chunks[i]`, in order.
  - `chunk_index = i`, `x_tile_range = stage.chunks[i].x_tiles`,
    `x_px_range = [x_tiles[0]*tile_size_px, x_tiles[1]*tile_size_px]`.
  - `props[]` contains the prop instances from SPEC.md Section 4 for this
    chunk: matching count, kinds, sizes (within ranges).
  - `props[].fill / stroke` come from the canonical palette.
  - Each prop's `shape` is one of `triangle` / `rect` / `ellipse` / `path`,
    with the corresponding geometry fields:
    - `triangle`: `points: [[x1,y1],[x2,y2],[x3,y3]]`
    - `rect`: `x_px, y_px, w, h, rx?`
    - `ellipse`: `cx, cy, rx, ry`
    - `path`: `d: "..."` (SVG path data)

- **`props[]` describes ONLY bg-near scenery.** No `hazard-marker`,
  `platform-base`, items (potions, keys), characters, or NPCs. Those
  layers (`03-tiles`, `04-props`, `06-characters`) own their own specs and
  paint on top of bg-near later.

- All numeric coordinates are integers.

## Why JSON, not SVG

The earlier SVG approach kept producing inconsistent output (ground-line
mismatches, palette drift, agents overwriting the file with broken XML).
JSON is structurally simple, agents author it deterministically, and any
downstream rasterizer can convert it to SVG/PNG with a small script:

```python
# scripts/render_scene_spec_to_svg.py — derive the SVG from JSON for visual review
import json, sys
spec = json.load(open(f'assets/scenes/{sys.argv[1]}/bg-near/scene-spec.json'))
# ... emit <svg> with <rect data-kind="chroma-bg">, <polygon data-kind="ground-fill">,
# and one <g id="chunk-N"> per chunks[i] containing one element per props[i].
```

The JSON is the source of truth.

## Verification

The post-flight checks below verify:
- File exists, scene_id and canvas dims match stage.
- Palette has the 8 required keys with #RRGGBB values.
- `ground_polyline` spans the canvas left to right.
- One chunks[] entry per stage chunk, each with `x_tile_range` matching
  stage and `props[]` count >= 3.
- Every prop has the required keys (`kind, x_px, y_px, w, h, fill`).
- JSON palette overlaps SPEC.md palette by at least 6 hex values.
- Bg-near scope only: no items, no characters, no platforms, no hazards, no leave_room_zones.

If a check fails, fix the JSON to match the brief.
