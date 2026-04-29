---
id: "scene-{{scene_id}}-02bb-scene-design"
title: "Scene `{{scene_id}}` — author scene-level design brief (DESIGN.md)"
description: "Agent writes assets/scenes/{{scene_id}}/DESIGN.md — the comprehensive scene-level design brief. Distills SPEC.md (narrative), stage.json (geometry), scene-plan.json (per-layer hints), concept.png + extracted/{far,mid,near}.png (visual anchors), and ART_BIBLE.md (project style) into ONE structured Markdown document covering all layers (bg-far, bg-mid, bg-near, tilemap, scene-props, characters), gameplay rhythm, scene-wide palette, and acceptance criteria. Every downstream layer's per-layer SPEC reads from this. NO API call."
inputs:
  - "assets/scenes/{{scene_id}}/SPEC.md"
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/extracted/bg-far.png"
  - "assets/scenes/{{scene_id}}/extracted/bg-mid.png"
  - "assets/scenes/{{scene_id}}/extracted/bg-near.png"
  - "assets/scenes/{{scene_id}}/extracted/manifest.json"
  - "ART_BIBLE.md"
outputs:
  - "assets/scenes/{{scene_id}}/DESIGN.md"
checks:
  - id: scene-design-md-exists
    cmd: test -s assets/scenes/{{scene_id}}/DESIGN.md
    description: DESIGN.md was written
  - id: scene-design-md-has-sections
    cmd: |
      python -c "
      t = open('assets/scenes/{{scene_id}}/DESIGN.md', encoding='utf-8').read().lower()
      required = ['mood', 'palette', 'layer', 'beat', 'acceptance']
      missing = [s for s in required if s not in t]
      assert not missing, 'DESIGN.md missing required sections: ' + ', '.join(missing)
      "
    description: DESIGN.md contains mood, palette, layer breakdown, beat, acceptance sections
  - id: scene-design-md-covers-all-layers
    cmd: |
      python -c "
      t = open('assets/scenes/{{scene_id}}/DESIGN.md', encoding='utf-8').read().lower()
      layers = ['bg-far', 'bg-mid', 'bg-near', 'tile', 'prop', 'character']
      missing = [l for l in layers if l not in t]
      assert not missing, 'DESIGN.md must address each layer; missing mention of: ' + ', '.join(missing)
      "
    description: DESIGN.md addresses every layer (bg-far, bg-mid, bg-near, tiles, props, characters)
  - id: scene-design-md-has-palette-hex
    cmd: |
      python -c "
      import re
      t = open('assets/scenes/{{scene_id}}/DESIGN.md', encoding='utf-8').read()
      hexes = re.findall(r'#[0-9a-fA-F]{6}', t)
      assert len(hexes) >= 8, 'DESIGN.md must commit at least 8 #RRGGBB hex values for the scene-wide palette; got ' + str(len(hexes))
      "
    description: DESIGN.md commits a concrete scene-wide hex palette (>= 8 values)
tags:
  - scene
  - "{{scene_id}}"
  - design
  - spec
---

# Scene `{{scene_id}}` — author scene-level design brief

## Role

You are the **scene's lead designer**. Your output is a single Markdown
document at `assets/scenes/{{scene_id}}/DESIGN.md` that every downstream
layer (bg-far, bg-mid, bg-near, tilemap, scene-props, characters) consults
to make decisions consistent with the rest of the scene.

This is **NOT** a redo of `SPEC.md` (the scene narrative) or `stage.json`
(the geometry) — it complements both:

- `SPEC.md` answers "what is this scene about?" (narrative).
- `stage.json` answers "where does each gameplay element sit?" (geometry).
- `DESIGN.md` answers "**how should this scene look and feel, layer by layer?**"
  (art direction). It commits the canonical scene-wide palette, mood,
  lighting, pacing, and per-layer responsibilities.

**No API call.** Read the inputs, reason once, write one Markdown file.

## What to read

1. `assets/scenes/{{scene_id}}/SPEC.md` — narrative.
2. `assets/scenes/{{scene_id}}/stage.json` — gameplay geometry.
3. `assets/scenes/{{scene_id}}/scene-plan.json` — per-layer palette hints.
4. `assets/scenes/{{scene_id}}/concept.png` — the hero-shot concept image
   (read with the Read tool to see the canonical look).
5. `assets/scenes/{{scene_id}}/extracted/bg-{far,mid,near}.png` — per-layer
   visual references extracted from the concept.
6. `assets/scenes/{{scene_id}}/extracted/manifest.json` — palette / density
   metadata per extracted layer.
7. `ART_BIBLE.md` — project-wide art rules (line weight, character
   proportions, shading style). The scene must respect these.

## What to write

ONE Markdown file at `assets/scenes/{{scene_id}}/DESIGN.md` with these
sections (in this order):

### 1. Scene mood & theme

Two to four sentences anchoring the emotional register. Tie to the narrative
and the concept image. Specify time-of-day / weather / lighting direction.

### 2. Canonical scene-wide palette

Table of 8-14 hex values with role names and which layer(s) each color
belongs to. This is the lock for the whole scene — bg-far, bg-mid, bg-near,
tiles, props, and characters all stay within these values (subject to
per-layer rules below). Include `chroma` (`#00FF00`) as the negative-space
value.

| Role           | Hex     | Layers using it           |
|----------------|---------|---------------------------|
| sky_top        | `#…`    | bg-far                    |
| sky_horizon    | `#…`    | bg-far                    |
| mid_silhouette | `#…`    | bg-mid                    |
| ground_fill    | `#…`    | bg-near, tiles            |
| ground_stroke  | `#…`    | bg-near, tiles            |
| foliage_fill   | `#…`    | bg-near, tiles            |
| wood           | `#…`    | bg-near, tiles, props     |
| ...            |         |                           |

### 3. Per-layer responsibilities

One subsection per layer. Each subsection answers: "what does THIS layer
contribute to the scene?" and "what does it explicitly NOT contribute?"

#### 3.1 bg-far (back wall)
- What it shows (sky, distant mountains, far horizon — fully opaque).
- Palette subset from Section 2 it uses.
- Lighting / atmospheric perspective notes.

#### 3.2 bg-mid (mid silhouette band)
- Silhouette mass, tree clumps, hill ridges.
- Top half mostly chroma; bottom half solid silhouette.

#### 3.3 bg-near (foreground edge scenery)
- Painted ground band + decorative props (foliage, rocks, stumps).
- Stays in bottom 50% of canvas (top 50% chroma).
- The bg-near painter will read its own per-layer brief
  (`bg-near/SPEC.md`) which derives from THIS document — make sure your
  per-chunk hints here are concrete enough to drive that derivation.

#### 3.4 tilemap (collidable tiles)
- Walkable surfaces — grass, dirt, water tiles. The art is per-tile not
  per-region; reference the tilesheet kinds in `scene-plan.tilesheet.tiles[]`.

#### 3.5 scene-props (interactive items)
- Pickups, animated decorations. Reference `stage.chunks[].scene_props[]`.

#### 3.6 characters
- Hero + classes. Defer to `03-characters` art bible; only note any
  scene-specific posing or framing.

### 4. Beat-by-beat scene rhythm

Walk `stage.beats[]` in order. For each beat, give one sentence describing
what the player is feeling / seeing / doing at that x_tile. This drives
foliage density, lighting accents, prop placement across all layers.

### 5. Cross-layer continuity rules

3-7 bullet points: e.g. "ground line in bg-near must align with tilemap
floor at y_tile from elevation", "lighting direction is the same across
all layers (upper-left)", "no foliage element exceeds canvas vertical
midline except trees and overhangs", etc.

### 6. Acceptance criteria for the whole scene

5-8 measurable conditions for accepting the composited scene:

- Per-layer outputs match their per-layer SPEC files.
- All layer palettes are subsets of Section 2's canonical palette.
- The composited preview reads as ONE scene (no layer feels misaligned).
- Lighting consistent across layers.
- Beat positions visible in the painted result (player should feel the
  rhythm without reading stage.json).

## Why this comes early

Every per-layer SPEC document downstream reads from this. If you don't
commit the palette here, each layer picks its own and the composited scene
looks like a quilt. If you don't define the lighting direction here, each
layer paints highlights on different sides. The scene-level brief is the
first art-direction commitment; everything else is its execution.

## Verification

The post-flight checks below verify:
- DESIGN.md exists, has the required section headings.
- Mentions every layer (bg-far, bg-mid, bg-near, tile, prop, character).
- Commits at least 8 `#RRGGBB` hex values for the scene-wide palette.

If a check fails, fix the brief (don't relax the check).
