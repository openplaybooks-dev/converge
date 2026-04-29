---
id: "scene-{{scene_id}}-02c-background-02b-bg-mid"
title: "Scene `{{scene_id}}` — bg-mid (segmented mid-distance silhouettes)"
description: "Container task. Spawns N per-segment children via WBS (segment count derived from scene-plan target_size + segment_width), then stitches them in 99-stitch."
wbs:
  type: nodejs
  path: ./wbs/index.js
inputs:
  - "assets/scenes/{{scene_id}}/scene-plan.json"
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/bg-far/final.png"
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-mid
  - container
---

# Scene `{{scene_id}}` — bg-mid (segmented)

This is a **container task** that spawns one segment task per slice of the wide map, then runs a final stitch step. The segment count is computed at WBS-seed time from the layer's `target_size[0]` and a per-layer `segment_width` (default 1024), with `overlap_px` (default 128) shared between adjacent segments.

Children:
- `wbs/templates/segment/TASK.md` — spawned once per segment as `seg-NNN`. Each segment declares the previous segment's PNG as an input, so the runner serializes them. The N-th model call receives the (N-1)-th segment as a reference image to anchor the seam.
- `99-stitch` — static child. Declares every `bg-mid/seg-NNN.png` as input via a glob and concatenates them into one wide `bg-mid.png` with feather-blended overlap.

**Why bg-far must finish first:** every segment uses the (already complete) `bg-far.png` as a sibling-below palette/lighting reference. The container's `inputs:` declares it so the runner blocks until far is on disk.

To change segment count or overlap: edit `bg.layers.mid.segment_width` / `bg.layers.mid.overlap_px` in `scenes/{{scene_id}}/scene-plan.json`. Reset this task with `converge reset` and re-run.
