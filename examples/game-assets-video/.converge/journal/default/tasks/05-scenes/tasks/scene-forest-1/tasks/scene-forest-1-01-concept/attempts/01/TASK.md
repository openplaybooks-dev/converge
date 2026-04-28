# Task: 05-scenes/scene-forest-1/scene-forest-1-01-concept

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