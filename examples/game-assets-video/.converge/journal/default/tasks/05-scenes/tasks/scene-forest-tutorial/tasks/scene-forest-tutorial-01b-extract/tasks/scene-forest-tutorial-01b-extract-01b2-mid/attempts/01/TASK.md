# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b2-mid

# Scene `forest-tutorial` — bg-mid extraction

## Run

```bash
python scripts/extract_bg_mid.py forest-tutorial
```

The script's prompt (`MID_PROMPT` in `scripts/extract_bg_mid.py`) instructs the model to amodal-complete the mid silhouette band — tree clumps, hill ridges — and fill non-mid regions with `#00FF00`. The script then chroma-keys green pixels to alpha after.

References passed to the model:
- The scene concept (base).
- The style sheet (universal style anchor).
- `bg-far.png` (sibling-below — palette / lighting anchor at the layer seam).

## Fitness contract

- Per-pixel irregular alpha (not a horizontal band slice).
- At least 10% transparent pixels (sky above, foreground below the silhouette band).
- Prompt sidecar is the real script's prompt (no fallback markers).

## Why bg-far must finish first

This task declares `extracted/bg-far.png` as an input. The runner blocks until far is on disk so the model can use it as a sibling-below reference for palette continuity at the layer seam.