---
title: Parallax Background Generation
description: Generate one full-resolution PNG per parallax layer entry in backgrounds.json
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies:
  - "02-asset-breakdown"
tags:
  - backgrounds
  - parallax
  - generation
outputs: []
---

# Parallax Background Generation

For each entry in `assets/backgrounds.json`, spawn one leaf:

- **{bg_id}-background** — Generate one full-resolution PNG at the manifest's `resolution`. **1 image-gen call** per layer.

Each `backgrounds.json` entry already represents one parallax layer (`parallax_layer: far|mid|near`), so a complete forest scene is three entries (`forest-far`, `forest-mid`, `forest-near`) — three independent leaves.

## Output Structure

```
assets/backgrounds/{bg_id}/
├── {bg_id}.png             # full resolution from manifest (e.g. 1920x1080)
├── {bg_id}.atlas.json      # trivial single-frame atlas
├── {bg_id}.prompt.txt
└── {bg_id}.seed.txt
```

## Skip Conditions

Gated by `vars.stop_after`. Skipped when `stop_after = "characters"`.
