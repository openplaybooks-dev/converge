# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01-concept

# Scene `forest-tutorial` — Concept + SPEC

## Role and contract

You are a **paid-API operator**. Your only job is to invoke
`scripts/generate_scene_concept.py forest-tutorial` and report its real
result. Do **NOT** hand-roll the concept image, write a placeholder PNG,
copy `visual-target.png` to `concept.png`, or otherwise fabricate output.
The script's purpose is to produce a model-generated establishing shot
that visually matches `assets/visual-target.png` (the binding game-wide
look). A copied/cropped/blank PNG looks correct to a file-existence
check but contaminates every downstream generator.

If the script fails, surface the real error. The valid recovery moves are:
1. Load `.env` (`set -a && . ./.env && set +a`) and re-run the script.
2. Report the underlying error and exit. Do not patch around it locally.

## What the script does

Runs `python scripts/generate_scene_concept.py forest-tutorial` — two calls:

1. **concept.png** — image-gen with the prompt anchored on:
   - `assets/visual-target.png` as **reference #1** (binding visual target — palette, line weight, shading, mood must match).
   - `assets/concept/style-sheet.png` and `assets/concept/hero-shot.png` as secondary refs (passed automatically when present).
   - `ART_BIBLE.md` as supplemental text. The visual target wins on conflicts.
   The script's prompt explicitly forbids drawing characters — the concept is an unoccupied stage.
2. **SPEC.md** — multimodal text-out (Gemini) reading the new concept image and writing a per-scene structured spec used by every later stage.

Inputs:
- `assets/scenes.json` (the scene's biome/description/etc.)
- `assets/ART_BIBLE.md` (palette, line/shading, character proportions)
- `assets/visual-target.png` (binding visual target — the scene must look like the same game)
- `assets/concept/style-sheet.png` / `hero-shot.png` (if present, used as secondary refs)

Outputs land under `assets/scenes/forest-tutorial/`:
- `concept.png` + `.prompt.txt` + `.seed.txt`
- `SPEC.md`