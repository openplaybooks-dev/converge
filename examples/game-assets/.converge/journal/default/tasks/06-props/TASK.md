---
title: Props & Hazards Generation
description: Generate spritesheets for items, hazards, and interactive props from objects.json
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies:
  - "02-asset-breakdown"
tags:
  - props
  - objects
  - hazards
  - generation
outputs: []
---

# Props & Hazards Generation

For each entry in `assets/objects.json`, spawn a complete prop pipeline:

1. **{obj_id}-01-spec** — Validate prop specification (writes `assets/objects/{id}/SPEC.md`).
2. **{obj_id}-spritesheet-{state}** (one per state) — Generate a 4×4 spritesheet for one animation state. Each leaf is **1 image-gen call** that draws all 16 frames in one canvas (same pattern as character spritesheets).

Hazards (`category: "hazard"`) and interactive props (`category: "interactive"`) share this pipeline. The category only affects keyframe selection and prompt language.

## Output Structure

```
assets/objects/{obj_id}/
├── SPEC.md
└── spritesheets/
    ├── idle/
    │   ├── idle.png              # 4x4 grid sheet
    │   ├── idle.atlas.json       # frame coords (Phaser/TexturePacker JSON-Hash)
    │   ├── idle.prompt.txt
    │   └── idle.seed.txt
    └── {other_state}/...
```

## Skip Conditions

This phase is gated by `vars.stop_after`. Skipped when `stop_after = "characters"`.
