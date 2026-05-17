---
id: 001-analyze-assets
title: Analyze Assets
description: Build the asset manifest for backgrounds, hero art, and decorative scene imagery
blocking: true
inputs:
  - .stitch/screens.json
  - .stitch/UX.md
  - .stitch/system/DESIGN.md
outputs:
  - .stitch/assets/manifest.json
checks:
  - id: manifest-exists
    cmd: test -f .stitch/assets/manifest.json
    description: manifest exists
---
# Analyze Assets

Create `.stitch/assets/manifest.json`.

Each asset object must include:

- `id`
- `name`
- `type` (`background`, `hero`, or `texture`)
- `screenIds`
- `promptStyle`
- `output`
- `width`
- `height`

Prefer a small, high-signal asset set. Do not invent dozens of images. The goal is enough generated imagery to support the screen themes and layered backgrounds.

