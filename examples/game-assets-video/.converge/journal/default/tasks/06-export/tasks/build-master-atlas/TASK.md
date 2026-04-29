---
id: build-master-atlas
title: Build master atlas (raw + Godot + Unity)
description: "Aggregate every per-sheet *.atlas.json into engine-ready master atlas files. Skipped unless stop_after ∈ {export, full}; on `sprites` the atlas is kept fresh by the per-scene manifest hook."
tags:
  - export
  - atlas
checks:
  - id: master-atlas-or-skipped
    description: Master atlas is fresh in export/full modes; cleanly skipped otherwise
    cmd: "python -c \"\nimport json, sys\nmode = 'sprites' or 'sprites'\nif mode in ('export', 'full'):\n    a = json.load(open('assets/atlas.json'))\n    n = sum(len(s['frames']) for slices in a['categories'].values() for s in slices)\n    assert n > 0, 'master atlas has zero frames'\n    print(f'master atlas OK ({n} frames)')\nelse:\n    print(f'skipped (stop_after={mode}) — atlas maintained by scene manifests')\n\"\n"
vars:
  stop_after: sprites
---

# Build Master Atlas

Aggregates every per-sheet `*.atlas.json` produced upstream into three engine-ready master atlases. Gated on `vars.stop_after` — runs only when `export` or `full`, since under `sprites` the atlas is already kept fresh by `scripts/build_scene_manifest.py`'s per-scene refresh hook.

```bash
case "sprites" in
  export|full)
    python3 scripts/build_master_atlas.py
    ;;
  *)
    echo "stop_after=sprites — skipping master atlas (already maintained by scene manifests)"
    ;;
esac
```

## Outputs (when not skipped)

- `assets/atlas.json` — raw aggregate, grouped by 5 categories (characters / objects / tile_maps / backgrounds / scenes). One slice per per-sheet atlas; each slice carries `asset_id`, `state`, `sheet_path`, and the original frame rectangles.
- `assets/atlas.godot.json` — Godot SpriteFrames-shaped: one animation per (category, asset_id, state) slice, with per-frame `region` rectangles pointing into the actual sheet PNG via `res://...` paths.
- `assets/atlas.unity.json` — Unity-style flat sprite list with rect + pivot per frame; sprite names are globally unique (`{asset_id}/{state}/{frame}`).

Per-scene assets land under `categories.scenes` with asset IDs like `forest-1/bg-far`, `forest-1/tilesheet`, `forest-1/prop/forest-mushroom-cluster`.

## Adding a new asset category later

Any new asset type that drops a `*.atlas.json` next to its PNG under `assets/{category}/...` is picked up automatically — `build_master_atlas.py` walks `assets/` for the configured category names. To add a new category, extend `CATEGORIES` at the top of `scripts/build_master_atlas.py`.
