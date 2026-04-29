# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b1-far

# Scene `forest-tutorial` — bg-far extraction

## Run

```bash
python scripts/extract_bg_far.py forest-tutorial
```

The script's prompt is a hand-written literal — see `scripts/extract_bg_far.py` `FAR_PROMPT`. It instructs the model to perform amodal completion: repaint the entire far layer as a complete fully-opaque landscape, inferring what is behind any mid/near occluders. No chroma-key. No transparency. No green pixels.

## Fitness contract

- Output is `assets/scenes/forest-tutorial/extracted/bg-far.png` — RGBA but with alpha=255 in every pixel (the script forces this regardless of what the model returned).
- Less than 5% transparent pixels (the check rejects anything with chroma-key holes).
- The prompt sidecar must be the real script's prompt (no fallback markers).

## What if it fails

1. Load `.env` (`set -a && . ./.env && set +a`) and re-run.
2. If the output still has transparent regions, that means the model is adding chroma-key despite the prompt — re-run with a fresh seed; the new pipeline auto-randomizes seeds on regen.