---
id: "scene-{{scene_id}}-02c-background-02c-bg-near-00-scene-md"
title: "Scene `{{scene_id}}` — author bg-near design brief (SPEC.md)"
description: "Agent writes bg-near/SPEC.md — the design brief for the bg-near painter. Reads scene SPEC.md (narrative), stage.json (geometry), scene-plan.json (palette hints), extracted/bg-near.png (visual reference), and the biome catalog. Distills these into a structured Markdown brief: overall mood, canonical palette, ground polyline, per-chunk scenery plan, what NOT to paint, acceptance criteria. NO API call. Pure agent reasoning + writing."
inputs:
  - "assets/scenes/{{scene_id}}/DESIGN.md"
  - "assets/scenes/{{scene_id}}/SPEC.md"
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/extracted/bg-near.png"
  - ".converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02c-background/02c-bg-near/foreground-props-catalog.json"
outputs:
  - "assets/scenes/{{scene_id}}/bg-near/SPEC.md"
checks:
  - id: bg-near-spec-md-exists
    cmd: test -s assets/scenes/{{scene_id}}/bg-near/SPEC.md
    description: bg-near/SPEC.md was written
  - id: bg-near-spec-md-has-sections
    cmd: |
      python -c "
      t = open('assets/scenes/{{scene_id}}/bg-near/SPEC.md', encoding='utf-8').read().lower()
      required = ['palette', 'ground', 'per-chunk', 'not in bg-near', 'acceptance']
      missing = [s for s in required if s not in t]
      assert not missing, 'SPEC.md missing required sections: ' + ', '.join(missing)
      "
    description: SPEC.md contains palette, ground, per-chunk, not-in-bg-near, acceptance sections
  - id: bg-near-spec-md-has-palette-hex
    cmd: |
      python -c "
      import re
      t = open('assets/scenes/{{scene_id}}/bg-near/SPEC.md', encoding='utf-8').read()
      hexes = re.findall(r'#[0-9a-fA-F]{6}', t)
      assert len(hexes) >= 6, 'SPEC.md must commit at least 6 #RRGGBB hex values for the canonical palette; got ' + str(len(hexes))
      "
    description: SPEC.md commits a concrete hex palette (>= 6 values)
  - id: bg-near-spec-md-has-chunk-coverage
    cmd: |
      python -c "
      import json, re
      t = open('assets/scenes/{{scene_id}}/bg-near/SPEC.md', encoding='utf-8').read()
      stage = json.load(open('assets/scenes/{{scene_id}}/stage.json'))
      n_chunks = len(stage['chunks'])
      # Count level-3 headers like '### Chunk 0' or '### Chunk N'
      headers = re.findall(r'^###\s+chunk\s+\d+', t, flags=re.IGNORECASE | re.MULTILINE)
      assert len(headers) >= n_chunks, 'SPEC.md must have >= ' + str(n_chunks) + ' per-chunk sections (### Chunk N); got ' + str(len(headers))
      "
    description: SPEC.md has one '### Chunk N' section per stage chunk
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-near
  - design-brief
---

# Scene `{{scene_id}}` — author bg-near design brief

## Role

You are writing the **design brief for the bg-near painter** (whether that
painter is a human artist or a downstream AI image-edit call). The brief lives
at `assets/scenes/{{scene_id}}/bg-near/SPEC.md` and is the canonical text
source-of-truth for what the bg-near layer should look like.

**This is NOT the scene narrative.** That already exists at
`assets/scenes/{{scene_id}}/SPEC.md` (produced by `01-concept`). This new
file is scoped to **just bg-near**: the painted foreground-edge scenery
(ground band + decorative props) that lives behind the tilemap and in front
of bg-mid silhouettes.

**No API call.** You read the inputs, reason once, write one Markdown file.

## What to read

1. `assets/scenes/{{scene_id}}/DESIGN.md` — the **scene-level art direction
   brief** (from `02bb-scene-design`). Section 2 commits the canonical
   scene-wide palette; Section 3.3 commits bg-near's specific role; Section
   4 walks the beats. Your bg-near brief MUST be consistent with this — pull
   palette + lighting + density notes from here, narrow to bg-near scope.
2. `assets/scenes/{{scene_id}}/SPEC.md` — the scene narrative.
3. `assets/scenes/{{scene_id}}/stage.json` — geometry source of truth:
   `world.{width_tiles, height_tiles}`, `tile_size_px`,
   `background.{target_width_px, target_height_px}`, `chunks[]` (each with
   `x_tiles`, `biome_variant`, `ground_type`, `narrative`, etc.),
   `elevation[]`, `beats[]`, `platforms[]`, `hazards[]`.
3. `assets/scenes/{{scene_id}}/scene-plan.json` — `bg.layers[id="near"].palette`
   prose + per-region hints.
4. `assets/scenes/{{scene_id}}/extracted/bg-near.png` — visual reference
   for the bg-near layer's palette and density. Read it with the Read tool.
5. `.../02c-bg-near/foreground-props-catalog.json` — per-biome prop kind
   menus + size buckets.

## What to write

ONE Markdown file at
`assets/scenes/{{scene_id}}/bg-near/SPEC.md` with these sections (in this
order):

### 1. Overall mood

Two or three sentences capturing the bg-near layer's intended emotional
register. Anchor to the scene narrative + biome of the scene's chunks.
Examples: "bright cheerful early-game forest", "menacing twilight dungeon
approach", "windswept desert at dusk". Specify lighting direction here.

### 2. Canonical palette

Table of 6-10 hex values with role names and what each color is used for.
This palette is locked scene-wide — every chunk uses the same colors.
Include `chroma` (`#00FF00`) as the negative-space color. Choose hexes that
are consistent with the visual reference (`extracted/bg-near.png`) and the
scene-plan's near-layer palette prose.

### 3. Ground polyline (binding geometry)

Reproduce stage's elevation samples in a table mapping each `(x_tile, y_tile)`
to canvas coordinates `(x_px, y_px)`. Use `baseline_px = round(target_height_px * 0.50)`
and amplification `AMP = 32 px / tile`:
`y_canvas = baseline_px + (y_tile - reference_y_tile) * AMP`,
where `reference_y_tile` is the median `y_tile` across the elevation samples.

### 4. Per-chunk scenery plan

One `### Chunk N — section_label (x_tile lo–hi, x_px lo–hi)` heading per
`stage.chunks[i]`. Under each:
- **Biome:** map `biome_variant` to a catalog biome key.
- **Ground material:** what the painted ground in this chunk looks like
  (grass / dirt path / mud / sand / snow / etc.).
- **Decoration (count + kinds):** N=4-7 props, kind names from the biome's
  catalog entry, size ranges from the size_classes table (tiny / small /
  medium / large / overhang).
- **Notes:** any continuity hints specific to this chunk (palette accent,
  density curve, transition cues). Bg-near scope ONLY — do not list items,
  characters, platforms, hazards, or other layers' content here. Those
  layers (`03-tiles`, `04-props`, `06-characters`) own their own specs and
  paint on top of bg-near later; bg-near simply paints the foreground edge
  end-to-end.

### 5. Cross-chunk continuity

3-5 bullet points covering: palette stays the same throughout, transitions
happen IN chunks not AT boundaries, foliage density progression (build-up
toward end?), lighting direction.

### 6. What's NOT in bg-near (do not paint)

Table listing every other layer that overlaps bg-near's space and the layer
that owns it: tiles, platforms, hazards, items, characters, sky, mid silhouettes.
The bg-near painter must paint AROUND these and leave the listed visual
zones clean.

### 7. Acceptance criteria

5-8 measurable conditions for accepting the painted output: ground polyline
match, top-50% chroma rule, per-chunk prop minimums, palette adherence,
"leave room" zones respected, single coherent scene end-to-end (no chunk
boundary visible).

## Why this comes before the SVG

The SVG is a visual concept derived from this brief. By writing the brief
first, the design decisions are explicit and reviewable in plain text BEFORE
any SVG is drawn. If the brief is wrong (palette feels off, prop densities
unbalanced, biome misidentified), it's cheap to edit Markdown — much cheaper
than redrawing SVG and downstream rasterization. The brief is the authoritative
spec; the SVG is its visual realization.

## Verification

The post-flight checks below verify that:
- `bg-near/SPEC.md` was written and is non-empty.
- It has the required section headings (palette, ground, per-chunk, not-in-bg-near, acceptance).
- It commits at least 6 `#RRGGBB` hex values for the palette.
- It has one `### Chunk N` heading per stage chunk.

If any check fails, fix the SPEC.md (don't relax the check).
