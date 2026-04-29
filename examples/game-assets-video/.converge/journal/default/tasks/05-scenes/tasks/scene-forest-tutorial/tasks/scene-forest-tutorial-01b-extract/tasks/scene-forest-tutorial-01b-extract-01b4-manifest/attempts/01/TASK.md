# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b4-manifest

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