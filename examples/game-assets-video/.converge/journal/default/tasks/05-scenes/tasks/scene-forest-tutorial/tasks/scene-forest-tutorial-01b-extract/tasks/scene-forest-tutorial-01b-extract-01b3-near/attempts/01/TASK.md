# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b3-near

# Scene `forest-tutorial` — bg-near extraction

## Run

```bash
python scripts/extract_bg_near.py forest-tutorial
```

The script's prompt (`NEAR_PROMPT` in `scripts/extract_bg_near.py`) instructs the model to amodal-complete the foreground edge — ground texture, foreground rocks, fern fronds, foreground tree trunk bases — and fill non-near regions (top of canvas) with `#00FF00`. The script then chroma-keys green pixels to alpha.

References passed to the model:
- The scene concept (base).
- The style sheet (universal style anchor).
- `bg-mid.png` (sibling-above — palette / lighting anchor at the layer seam).

## Fitness contract

- Per-pixel irregular alpha.
- More than 30% transparent (foreground sits in lower 30-45% of canvas; everything above is keyed out).
- Prompt sidecar is the real script's prompt.

## Why bg-mid must finish first

This task declares `extracted/bg-mid.png` as an input. The runner blocks until mid is on disk so the model can use it as a sibling-above reference for palette continuity at the layer seam.