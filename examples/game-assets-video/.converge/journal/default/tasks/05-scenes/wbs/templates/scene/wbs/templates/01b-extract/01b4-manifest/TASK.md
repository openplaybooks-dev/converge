---
id: "scene-{{scene_id}}-01b-extract-01b4-manifest"
title: "Scene `{{scene_id}}` — extract layer manifest (palette, heights, density)"
description: "Vision-pass JSON manifest describing each layer's palette, subject_height_tiles, and feature density. Merges back into scenes.json[{{scene_id}}].background.layers[]. Waits on all three layer extractions."
cost_cents: 5
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/extracted/bg-far.png"
  - "assets/scenes/{{scene_id}}/extracted/bg-mid.png"
  - "assets/scenes/{{scene_id}}/extracted/bg-near.png"
outputs:
  - "assets/scenes/{{scene_id}}/extracted/manifest.json"
checks:
  - id: bg-manifest-exists
    cmd: test -s assets/scenes/{{scene_id}}/extracted/manifest.json
    description: manifest.json was written
  - id: bg-manifest-has-three-layers
    cmd: |
      python -c "
      import json
      m = json.load(open('assets/scenes/{{scene_id}}/extracted/manifest.json'))
      layers = m.get('layers') or {}
      missing = [l for l in ('far', 'mid', 'near') if l not in layers]
      assert not missing, f'manifest missing layer entries: {missing}'
      "
    description: manifest contains all three layer entries (far / mid / near)
agent: paid-api-operator
tags:
  - scene
  - "{{scene_id}}"
  - extract
  - manifest
---

# Scene `{{scene_id}}` — extraction manifest

## Run

```bash
python scripts/extract_bg_manifest.py {{scene_id}}
```

Calls Gemini text-out on `concept.png` to produce structured JSON describing each layer's palette, subject_height_tiles, feature_density, and visible tiles / scene_props. Best-effort merges the layer info back into `scenes.json[{{scene_id}}].background.layers[]` so downstream tasks (background generators, scene-plan) inherit it.

## Fitness contract

- `manifest.json` exists.
- Contains entries for `far`, `mid`, `near`.

This task waits on all three layer-extraction tasks to complete before running, so the manifest reflects the actual extracted output (not just the concept).
