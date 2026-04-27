---
title: Master Atlas Export
description: Aggregate every per-sheet atlas (including per-scene) into engine-ready master atlas files
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies:
  - "03-characters"
  - "03-shared-props"
  - "05-scenes"
tags:
  - export
  - atlas
outputs: []
---

# Master Atlas Export

Runs `scripts/build_master_atlas.py`. **No image-gen** — pure aggregation of every per-sheet `*.atlas.json` produced by the upstream phases.

## What it produces

- `assets/atlas.json` — raw aggregate, grouped by category (characters / objects / tile_maps / backgrounds / scenes). One slice per per-sheet atlas; each slice carries asset_id, state, sheet path, and the original frame rectangles. Per-scene assets land under the `scenes` category with asset IDs like `forest-1/bg-far`, `forest-1/tilesheet`, `forest-1/prop/torch`.
- `assets/atlas.godot.json` — Godot SpriteFrames-shaped: one animation per (category, asset_id, state) slice, with per-frame `region` rectangles pointing into the actual sheet PNG via `res://...` paths.
- `assets/atlas.unity.json` — Unity-style flat sprite list with rect + pivot per frame; sprite names are globally unique (`{asset_id}/{state}/{frame}`).

## Skip Conditions

Gated by `vars.stop_after`. Runs only when `stop_after` is `"export"` or `"full"`. Skipped in `"characters"` and the default `"sprites"` modes.

## Adding new asset categories later

Any new asset type that drops a `*.atlas.json` next to its PNG under `assets/{category}/...` will be picked up automatically — `build_master_atlas.py` walks `assets/` for the configured category names. To add a new category, extend `CATEGORIES` at the top of `scripts/build_master_atlas.py`.
