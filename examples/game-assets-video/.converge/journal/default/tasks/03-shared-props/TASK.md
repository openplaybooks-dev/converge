---
title: Shared Props (cross-scene)
description: Generate spritesheets for items, hazards, and interactive props that are reused across scenes. Reads `objects-shared.json` (falls back to legacy `objects.json`).
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies:
  - "01-art-bible"
tags:
  - shared-assets
  - props
  - objects
  - hazards
  - generation
outputs: []
---

# Props & Hazards Generation

For each entry in `assets/objects.json`, spawn a complete prop pipeline:

1. **{obj_id}-01-spec** — Validate prop specification (writes `assets/objects/{id}/SPEC.md`).
2. **{obj_id}-spritesheet-{state}** (one per state) — Generate a 4×2 spritesheet (8 frames) for one animation state. Each leaf is **1 image-gen call** that draws all 8 frames in one canvas, with up to 2 retries if grid auto-detection fails. Charges via `lib.budget.charged()`.

Hazards (`category: "hazard"`) and interactive props (`category: "interactive"`) share this pipeline. The category only affects keyframe selection and prompt language.

## Output Structure

```
assets/objects/{obj_id}/
├── SPEC.md
└── spritesheets/
    ├── idle/
    │   ├── idle.png              # 4x2 grid sheet (1536x1024) or auto-detected layout
    │   ├── idle.atlas.json       # frame coords (Phaser/TexturePacker JSON-Hash)
    │   ├── idle.prompt.txt
    │   └── idle.seed.txt
    └── {other_state}/...
```

Note: if the model produces an unexpected layout (e.g. 1×1 instead of 4×2), the script accepts what was rendered and writes the atlas to match — downstream tools read `meta.cols/rows/frame_count` from the atlas, not the requested layout.

## Skip Conditions

This phase is gated by `vars.stop_after`. Skipped when `stop_after = "characters"`.
