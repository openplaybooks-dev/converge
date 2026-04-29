---
id: scene-forest-tutorial-01b-extract-01b4-manifest
title: "Scene `forest-tutorial` — extract layer manifest (palette, heights, density)"
description: "Vision-pass JSON manifest describing each layer's palette, subject_height_tiles, and feature density. Merges back into scenes.json[forest-tutorial].background.layers[]. Waits on all three layer extractions."
agent: paid-api-operator
tags:
  - scene
  - forest-tutorial
  - extract
  - manifest
inputs:
  - assets/scenes/forest-tutorial/concept.png
  - assets/scenes/forest-tutorial/extracted/bg-far.png
  - assets/scenes/forest-tutorial/extracted/bg-mid.png
  - assets/scenes/forest-tutorial/extracted/bg-near.png
outputs:
  - assets/scenes/forest-tutorial/extracted/manifest.json
checks:
  - id: bg-manifest-exists
    description: manifest.json was written
    cmd: test -s assets/scenes/forest-tutorial/extracted/manifest.json
  - id: bg-manifest-has-three-layers
    description: manifest contains all three layer entries (far / mid / near)
    cmd: "python -c \"\nimport json\nm = json.load(open('assets/scenes/forest-tutorial/extracted/manifest.json'))\nlayers = m.get('layers') or {}\nmissing = [l for l in ('far', 'mid', 'near') if l not in layers]\nassert not missing, f'manifest missing layer entries: {missing}'\n\"\n"
vars:
  cost_cents: 5
  scene_id: forest-tutorial
---

# Scene `forest-tutorial` — extraction manifest

## Run

```bash
python scripts/extract_bg_manifest.py forest-tutorial
```

Calls Gemini text-out on `concept.png` to produce structured JSON describing each layer's palette, subject_height_tiles, feature_density, and visible tiles / scene_props. Best-effort merges the layer info back into `scenes.json[forest-tutorial].background.layers[]` so downstream tasks (background generators, scene-plan) inherit it.

## Fitness contract

- `manifest.json` exists.
- Contains entries for `far`, `mid`, `near`.

This task waits on all three layer-extraction tasks to complete before running, so the manifest reflects the actual extracted output (not just the concept).
