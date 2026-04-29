---
id: scene-forest-tutorial-02c-background-02c-bg-near
title: "Scene `forest-tutorial` — bg-near (segmented foreground edge)"
description: "Container task. Spawns N per-segment children via WBS (segment count derived from scene-plan target_size + segment_width), then stitches them in 99-stitch."
tags:
  - scene
  - forest-tutorial
  - background
  - bg-near
  - container
inputs:
  - assets/scenes/forest-tutorial/scene-plan.json
  - assets/scenes/forest-tutorial/stage.json
  - assets/scenes/forest-tutorial/bg-mid.png
wbs:
  type: nodejs
  path: ./wbs/index.js
vars:
  scene_id: forest-tutorial
---

# Scene `forest-tutorial` — bg-near (segmented)

Same shape as `02b-bg-mid`: a WBS-driven container that fans out one segment task per slice of the wide map, then runs a final stitch step.

Children:
- `wbs/templates/segment/TASK.md` — per-segment template, spawned as `seg-NNN`. Each declares the previous segment as an input; the seam is anchored on that previous PNG.
- `99-stitch` — concatenates `bg-near/seg-*.png` into `bg-near.png`. Default overlap is 256px (heavier feathering than mid because foreground content is busier and seams are more visible).

**Why bg-mid must finish first:** every near segment uses the (already complete) `bg-mid.png` as a sibling-above palette/lighting reference. The container's `inputs:` declares it so the runner blocks until mid is on disk.

To change segment count or overlap: edit `bg.layers.near.segment_width` / `bg.layers.near.overlap_px` in `scenes/forest-tutorial/scene-plan.json`. Reset and re-run.
