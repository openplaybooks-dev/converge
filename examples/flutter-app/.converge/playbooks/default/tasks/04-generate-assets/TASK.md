---
id: 04-generate-assets
title: Generate Assets — Icons, Illustrations & Images
description: Two-phase asset pipeline — analyze app to discover needed assets, then generate and wire each one
seeds:
  - type: nodejs
    path: ./seeds/generate-assets.seed.js
blocking: true
depends_on:
  - 03-build-screens
tags:
  - assets
  - svg
  - illustrations
  - icons
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - lib/screens/**/*.dart
  - lib/models/*.dart
outputs:
  - assets/**/*.svg
  - assets/**/*.png
checks:
  - id: assets-json-exists
    cmd: test -f assets.json
    description: Asset manifest was created by analysis step
  - id: assets-directory-exists
    cmd: test -d assets/
    description: Asset output directory exists
  - id: svgs-generated
    cmd: find assets -name '*.svg' -type f | wc -l | awk '{if ($1 >= 1) exit 0; exit 1}'
    description: At least 1 SVG asset generated
  - id: flutter-validate
    cmd: flutter pub get && dart analyze lib/
    description: Flutter project validates with new assets
---

# Generate Assets — Icons, Illustrations & Images

This epic generates all visual assets for the app through a two-phase pipeline:

## Phase 1: Analyze (subtask `001-analyze-assets`)

Scan the built screens, models, providers, and design docs to discover what assets the app needs. Produces `assets.json` — a manifest listing every asset with its type, output path, generation guidelines, and wiring instructions.

## Phase 2: Per-Asset Pipeline (Seed-spawned from `assets.json`)

For each asset in the manifest, run a 3-step pipeline:

1. **Spec** — Read DESIGN.md + asset info from the manifest, write a detailed SPEC.md with visual description, colors, dimensions, and style notes
2. **Generate** — Read SPEC.md, create the actual asset file (SVG/PNG) at the specified output path
3. **Wire** — Integrate the asset into Flutter code per the wiring instructions from the manifest

## How It Works

The Seed script (`seed/index.js`) reads `assets.json` and spawns one parent task per asset, each containing the 3-step pipeline as children. Assets are chained sequentially via dependencies.

## Inputs

- `.stitch/screens.json` — screen metadata (names, routes, descriptions)
- `.stitch/system/DESIGN.md` — design system (colors, typography, style)
- `lib/screens/**/*.dart` — built screen code (to find placeholders, missing assets)
- `lib/models/*.dart` — data models (fields referencing assets)

## Outputs

- `assets.json` — asset manifest (from analysis step)
- `assets/**/*.svg` — generated SVG assets
- `assets/**/*.png` — generated raster assets (if any)
- `lib/widgets/assets/*_asset.dart` — Flutter widget wrappers for assets
