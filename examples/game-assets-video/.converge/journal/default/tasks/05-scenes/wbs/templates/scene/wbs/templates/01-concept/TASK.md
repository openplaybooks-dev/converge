---
id: "scene-{{scene_id}}-concept"
title: "Scene `{{scene_id}}` — concept + SPEC"
description: "Render concept hero-shot for `{{scene_id}}` and derive SPEC.md."
outputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/concept.prompt.txt"
  - "assets/scenes/{{scene_id}}/SPEC.md"
checks:
  - id: scene-concept-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/concept.png
    description: Scene concept image written
  - id: scene-spec-has-content
    cmd: |
      python -c "import pathlib; t = pathlib.Path('assets/scenes/{{scene_id}}/SPEC.md').read_text(encoding='utf-8'); assert len(t) > 200, f'SPEC.md too short ({len(t)} chars)'"
    description: SPEC.md has body text (not an empty stub)
tags:
  - scene
  - "{{scene_id}}"
  - concept
---

# Scene `{{scene_id}}` — Concept + SPEC

Runs `python scripts/generate_scene_concept.py {{scene_id}}` — two calls:

1. **concept.png** — image-gen using `assets/visual-target.png` as the base reference and `ART_BIBLE.md` as the style spec. Single 16:9 hero-shot.
2. **SPEC.md** — multimodal text-out (Gemini) reading the new concept image and writing a per-scene structured spec used by every later stage.

Inputs:
- `assets/scenes.json` (the scene's biome/description/etc.)
- `assets/ART_BIBLE.md` (palette, line/shading, character proportions)
- `assets/visual-target.png` (style anchor)

Outputs land under `assets/scenes/{{scene_id}}/`:
- `concept.png` + `.prompt.txt` + `.seed.txt`
- `SPEC.md`
