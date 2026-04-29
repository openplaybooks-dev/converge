---
id: "scene-forest-tutorial-02c-background-02c-bg-near"
title: "Scene `forest-tutorial` — bg-near (per-chunk WBS: spec → svg → render → paint)"
description: "Container task. Each chunk is its own WBS subtree (4 sub-tasks) so geometry, palette, and seams are constrained at every step. Chunks serialize via the prev-chunk paint output; chunk N>0 inpaints by physically pasting the previous chunk's right-edge strip onto the new canvas before the model paints. Output lands at bg-near/segments/seg-NNN.png."
wbs:
  type: nodejs
  path: ./wbs/index.js
inputs:
  - "assets/scenes/forest-tutorial/scene-plan.json"
  - "assets/scenes/forest-tutorial/stage.json"
  - "assets/scenes/forest-tutorial/bg-mid/final.png"
tags:
  - scene
  - "forest-tutorial"
  - background
  - bg-near
  - container
---

# Scene `forest-tutorial` — bg-near (per-chunk WBS)

The free-segment pipeline drifted from gameplay geometry, so each chunk now owns a full WBS subtree with constraint checks at every step. The flow:

```
02c-bg-near
├── chunk-001 (WBS container)
│   ├── 01-spec    agent derives chunk-spec.json from stage geometry (no API)
│   ├── 02-svg     agent writes chunk.svg from chunk-spec (no API)
│   ├── 03-render  cairosvg → chunk.skeleton.png (deterministic)
│   └── 04-paint   image-edit → seg-001.png (1 paid call)
├── chunk-002 (waits on seg-001.png)
│   └── ... same 4 sub-tasks ...
├── chunk-NNN
├── 97-validate (vision-judge critique, unchanged)
└── 99-stitch   (feather-blend only; no inpaint pass)
```

## What each step does

1. **`01-spec`** — agent derives `chunks/chunk-NNN/chunk-spec.json` from `stage.json`. Geometry (elevation, props, hazards, platforms) is mechanically clipped to the chunk's x-tile range. **Palette is inherited verbatim** from the previous chunk's spec (chunk 0 picks from `scene-plan.bg.layers[near].palette` + `extracted/bg-near.png`). The constraint check verifies palette equality byte-for-byte to kill cross-chunk style drift.

2. **`02-svg`** — agent writes `chunks/chunk-NNN/chunk.svg`, sized to the chunk's pixel canvas (not the whole scene). One ground-fill polygon, foliage, hazard-marker rects, and platform-base rects, each placed at the spec's exact coords. Constraint checks verify canvas dims, ground-fill-first ordering, and 1:1 hazard/platform rects per spec entry.

3. **`03-render`** — `scripts/render_bg_near_chunk.py` uses cairosvg to rasterize the SVG to `chunks/chunk-NNN/chunk.skeleton.png` at the spec's exact dims. Deterministic.

4. **`04-paint`** — `scripts/paint_bg_near_chunk.py` makes one image-edit call:
   - **Chunk 0**: edits the skeleton directly. References: style-sheet, scene concept, `bg-mid/final.png`.
   - **Chunk N>0** (inpaint flow): slices the rightmost {overlap}px of `seg-(N-1).png`, pastes it onto the leftmost portion of the skeleton → `chunks/chunk-NNN/inpaint-input.png`, then edits that composite. The prompt instructs the model to PRESERVE the leftmost strip pixel-for-pixel and paint the rest. After the call, the painter hard-pastes the prev right-strip back over the model output so the seam constraint check always passes regardless of model fidelity.

   Output: `bg-near/segments/seg-NNN.png` — same path the existing `97-validate` and `99-stitch` consume, so those work unchanged.

## Why this is constraint-clean

- **Per-step post-flight checks.** Spec geometry must be a subset of stage's; SVG canvas must match the spec; skeleton PNG must match canvas dims; paint output must satisfy the green-screen distribution AND the seam preservation RMS.
- **Palette lock.** Chunks N>0 inherit the chunk-0 palette verbatim; the check fails if any color drifts.
- **Inpaint > anchor reference.** The prev-chunk strip is physically present in the model's input canvas, not just an attached reference. The painter additionally re-pastes the strip after the call so the seam is bit-identical at the chunk boundary.
- **Stitch is feather-only.** No more $35¢ AI seam-inpaint pass; per-chunk inpaint already pre-aligns the seams.

## Cost per scene

1 image-edit call per chunk (~8¢). For an 8-chunk near layer ≈ 64¢. No spec/SVG/render API calls; no stitch inpaints.

## Why bg-mid must finish first

Every chunk uses `bg-mid/final.png` as the sibling-below palette anchor (a reference image to the painter). The container's `inputs:` declares it so the runner blocks until mid is on disk.

## To change chunk count

Edit `stage.beats[]` (beat-driven sectioning) or `stage.background.{segment_width_px, overlap_px.near}` (width-fallback). Reset the journal and re-run.
