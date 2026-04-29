# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02c-bg-near/scene-forest-tutorial-02c-background-02c-bg-near-seg-02

# Scene `forest-tutorial` — bg-near segment 02/8

## Role

You are a **paid-API operator**. Run the script and report its real result.

## Run

```bash
python scripts/generate_bg_layer_segment.py forest-tutorial near 1 8 \
  --x-lo 0.1230 --x-hi 0.2049 \
  --section-label "first-small-rise → health-potion-learn" --section-kind "platform-up → pickup"
```

This segment owns the **`first-small-rise → health-potion-learn`** section (x_norm `[0.1230, 0.2049]`). Section boundaries come from `stage.json[beats[]]` so each segment is one beat-bounded slice of the gameplay rhythm, not an arbitrary fraction of total width.

The script uses the **near-segment prompt builder** which:
- Frames the layer as a foreground strip (bottom 30-45% has content, above is `#00FF00`).
- For segment ≥ 1, anchors the seam on the previous segment's PNG: "the leftmost ~10% of THIS segment must continue the foreground from the right edge of the previous segment, no visible seam, no repeating a prop the previous segment already showed".
- Forbids horizon-line / mid-distance content.

References passed to the model:
- `assets/concept/style-sheet.png`
- `assets/scenes/forest-tutorial/concept.png`
- For segment ≥ 1: `assets/scenes/forest-tutorial/bg-near/seg-NNN.png` (previous segment — seam anchor)
- `assets/scenes/forest-tutorial/bg-mid.png` (sibling-above — palette/lighting at the layer seam)

## Why each segment waits on the previous

The `inputs:` list declares the previous segment's PNG. The runner blocks until that file exists, which serializes generation (seg-001 → seg-002 → … → seg-N). The seam-anchor reference is what keeps adjacent segments visually continuous.