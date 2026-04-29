# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02a-decompose

# Scene `forest-tutorial` — Decompose to scene-plan.json

Runs `python scripts/decompose_scene.py forest-tutorial`. Produces a
single structured JSON that bundles exactly the context every
downstream per-layer / per-tile / per-prop generator needs.

This is the **progressive-decomposition** core: instead of every
generation script re-deriving palette + adjacency + animation_type
from the raw scenes.json + style preset, all that work happens once
in this text-out task and gets written to `scene-plan.json`. Each
generator reads its slice and runs ONE focused image-gen call.

## Inputs (multimodal)

- `assets/concept/style-sheet.png` — universal style anchor
- `assets/scenes/forest-tutorial/concept.png` — scene anchor
- `assets/scenes/forest-tutorial/extracted/bg-{far,mid,near}.png` — slices
- `assets/scenes/forest-tutorial/scenes.json[scene]` entry
- `assets/catalog.json` — canonical prop animation_type

## Outputs

- `assets/scenes/forest-tutorial/scene-plan.json` — bg.layers[],
  tilesheet.tiles[] (with adjacency), scene_props[] (with
  animation_type + keyframes_id)
- `assets/scenes/forest-tutorial/scene-plan.raw.txt` — debug sidecar

## Cost

- 1 text-out call (~5¢ on Gemini)