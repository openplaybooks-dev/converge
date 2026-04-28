---
id: "scene-{{scene_id}}-01b-extract"
title: "Scene `{{scene_id}}` — extract layers from concept"
description: "Vision-pass extraction of each parallax layer from concept.png as chroma-keyed PNGs + per-asset SPEC manifest. Makes concept.png the source of truth for downstream generators."
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
outputs:
  - "assets/scenes/{{scene_id}}/extracted/manifest.json"
checks:
  - id: extracted-manifest-exists
    cmd: test -s assets/scenes/{{scene_id}}/extracted/manifest.json
    description: extraction manifest written
  - id: at-least-one-layer-extracted
    cmd: |
      python -c "
      import json, os
      m = json.load(open('assets/scenes/{{scene_id}}/extracted/manifest.json'))
      layers = m.get('layers') or {}
      assert layers, 'no layers in manifest'
      missing = []
      for layer_id in layers:
          path = f'assets/scenes/{{scene_id}}/extracted/bg-{layer_id}.png'
          if not os.path.exists(path):
              missing.append(path)
      assert not missing, f'missing extracted PNGs: {missing}'
      "
    description: every declared layer has its extracted PNG on disk
tags:
  - scene
  - "{{scene_id}}"
  - extract
  - concept-driven
---

# Scene `{{scene_id}}` — Extract layers from concept

Runs `python scripts/extract_concept_layers.py {{scene_id}}`. Two passes:

**1. Per-layer image-gen pass.** For each parallax layer declared in `scenes.json[{{scene_id}}].background.layers`, send `concept.png` to the model with a strict prompt: "output the same image but keep ONLY the {layer} content; render everything else as pure chroma-green `#00FF00`." The output is then run through `lib/stitch.chroma_green_to_alpha` so the green pixels become `alpha=0`. Result: `assets/scenes/{{scene_id}}/extracted/bg-{layer}.png` — a faithful slice of the concept image with transparent negative space.

**2. Manifest extraction (text-out, JSON).** A second pass calls `generate_text_from_image` on the same concept and asks for structured JSON: per-layer `subject_height_tiles`, `palette` swatches, `feature_density`, plus inferred `tiles_visible` / `scene_props_visible` lists. Saves to `extracted/manifest.json` and merges back into `scenes.json` (only fills `subject_height_tiles` if the user hasn't set it; always sets `extracted_layer_path`).

## Why

`concept.png` was previously a vague style hint. Two failure modes followed:

- **Sizing drift** — bg-mid trees were rendered at 6 tiles when 3.5 was intended, because each generator composed scale from scratch.
- **Style drift** — the trees in bg-far looked nothing like the trees in concept.png because the concept was just a mood reference, not a literal contract.

After this stage, `02-background` uses each `extracted/bg-{layer}.png` as the **segment-1 seed** for the wide bg map. The leftmost screen-width of every wide map is pixel-identical to what the concept showed. Subsequent segments extend that content rightward via the existing stitch pipeline.

## Cost

- 3 image-gen calls (one per layer) ≈ 15¢ on Gemini
- 1 text-out pass for the manifest ≈ 5¢
- Total ≈ 20¢ per scene

But this saves ~15¢ in `02-background` (segment 1 of each layer is no longer a paid call — the extracted crop IS segment 1), so net delta is ~+5¢/scene for much better visual fidelity.

## Escape hatch

To opt out for a specific layer (e.g., the model's extraction came out badly), set `use_extraction: false` in that layer's entry in `scenes.json`:

```json
{ "id": "mid", "transparent": true, "use_extraction": false }
```

The generator falls back to the original concept-as-style-reference flow for that layer. To re-extract after editing the concept, pass `--force` to the script directly.
