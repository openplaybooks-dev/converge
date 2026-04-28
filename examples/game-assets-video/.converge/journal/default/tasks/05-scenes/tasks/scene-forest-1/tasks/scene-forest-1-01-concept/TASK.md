---
id: scene-forest-1-01-concept
title: "Scene `forest-1` — concept + SPEC"
description: "Render concept hero-shot for `forest-1` and derive SPEC.md."
tags:
  - scene
  - forest-1
  - concept
outputs:
  - assets/scenes/forest-1/concept.png
  - assets/scenes/forest-1/concept.prompt.txt
  - assets/scenes/forest-1/SPEC.md
checks:
  - id: scene-concept-png-exists
    description: Scene concept image written
    cmd: test -s assets/scenes/forest-1/concept.png
  - id: scene-spec-has-content
    description: SPEC.md has body text (not an empty stub)
    cmd: "python -c \"import pathlib; t = pathlib.Path('assets/scenes/forest-1/SPEC.md').read_text(encoding='utf-8'); assert len(t) > 200, f'SPEC.md too short ({len(t)} chars)'\"\n"
vars:
  scene_id: forest-1
  scene_name: Forest Glade — opening scene
  scene_biome: temperate-forest
  scene_description: "A grassy forest clearing at midday. Soft mist on the horizon, a winding dirt path entering from the left, fern foliage in the foreground. The hero starts here. Used as the playable opening of the platformer."
  bg_layers: "[{\"id\":\"far\",\"transparent\":false,\"transition_below\":null,\"subject_height_tiles\":1.5},{\"id\":\"mid\",\"transparent\":true,\"transition_below\":\"far\",\"subject_height_tiles\":3.5},{\"id\":\"near\",\"transparent\":true,\"transition_below\":\"mid\",\"subject_height_tiles\":7}]"
  tile_variant_ids: "[\"grass-base\",\"grass-edge-left\",\"grass-edge-right\",\"earth-fill\",\"earth-rocky\",\"flower-yellow\",\"stone-small\",\"mushroom-red\"]"
  scene_prop_ids: "[\"forest-mushroom-cluster\"]"
---

# Scene `forest-1` — Concept + SPEC

Runs `python scripts/generate_scene_concept.py forest-1` — two calls:

1. **concept.png** — image-gen using `assets/visual-target.png` as the base reference and `ART_BIBLE.md` as the style spec. Single 16:9 hero-shot.
2. **SPEC.md** — multimodal text-out (Gemini) reading the new concept image and writing a per-scene structured spec used by every later stage.

Inputs:
- `assets/scenes.json` (the scene's biome/description/etc.)
- `assets/ART_BIBLE.md` (palette, line/shading, character proportions)
- `assets/visual-target.png` (style anchor)

Outputs land under `assets/scenes/forest-1/`:
- `concept.png` + `.prompt.txt` + `.seed.txt`
- `SPEC.md`
