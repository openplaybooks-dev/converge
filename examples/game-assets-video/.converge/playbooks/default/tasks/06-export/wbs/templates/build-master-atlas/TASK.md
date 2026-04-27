---
id: "build-master-atlas"
title: "Build master atlas (raw + Godot + Unity)"
description: "Aggregate every per-sheet *.atlas.json into engine-ready master atlas files"
outputs:
  - "assets/atlas.json"
  - "assets/atlas.godot.json"
  - "assets/atlas.unity.json"
checks:
  - id: master-atlas-files-exist
    cmd: test -s assets/atlas.json && test -s assets/atlas.godot.json && test -s assets/atlas.unity.json
    description: All three master atlas files exist and are non-empty
  - id: master-atlas-frame-count-positive
    cmd: |
      python -c "import json; agg=json.load(open('assets/atlas.json')); n=sum(len(s['frames']) for slices in agg['categories'].values() for s in slices); assert n>0, f'master atlas has zero frames'"
    description: Master atlas contains at least one frame
tags:
  - export
  - atlas
---

# Build Master Atlas

Run `scripts/build_master_atlas.py` to aggregate every per-sheet `*.atlas.json` produced by phases 03–06.

```bash
python3 scripts/build_master_atlas.py
```

## Outputs

- `assets/atlas.json` — raw aggregate, grouped by category (characters / objects / tile_maps / backgrounds). One slice per per-sheet atlas; each slice carries `asset_id`, `state`, `sheet_path`, and the original frame rectangles.
- `assets/atlas.godot.json` — Godot SpriteFrames-shaped: one animation per (category, asset_id, state) slice, with per-frame `region` rectangles pointing into the actual sheet PNG via `res://...` paths.
- `assets/atlas.unity.json` — Unity-style flat sprite list with rect + pivot per frame; sprite names are globally unique (`{asset_id}/{state}/{frame}`).

## Adding a new asset category later

Any new asset type that drops a `*.atlas.json` next to its PNG under `assets/{category}/...` will be picked up automatically — `build_master_atlas.py` walks `assets/` for the configured category names. To add a new category, extend `CATEGORIES` at the top of `scripts/build_master_atlas.py`.
