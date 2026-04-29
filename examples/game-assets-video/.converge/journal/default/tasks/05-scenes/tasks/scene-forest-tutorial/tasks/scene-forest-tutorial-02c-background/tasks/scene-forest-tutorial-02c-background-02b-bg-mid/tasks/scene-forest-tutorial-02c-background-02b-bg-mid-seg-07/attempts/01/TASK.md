# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02b-bg-mid/scene-forest-tutorial-02c-background-02b-bg-mid-seg-07

# Scene `forest-tutorial` — bg-mid segment 07/8

## Role

You are a **paid-API operator**. Run the script and report its real result.

## Run

```bash
python scripts/generate_bg_layer_segment.py forest-tutorial mid 6 8 \
  --x-lo 0.6557 --x-hi 0.8197 \
  --section-label "key-pickup → final-descent" --section-kind "pickup → platform-down"
```

This segment owns the **`key-pickup → final-descent`** section (x_norm `[0.6557, 0.8197]`). Section boundaries come from `stage.json[beats[]]` so each segment is one beat-bounded slice of the gameplay rhythm, not an arbitrary fraction of total width.

The script uses the **mid-segment prompt builder** which:
- Forces silhouettes-in-a-band, pure `#00FF00` outside the band content.
- For segment ≥ 1, anchors the seam on the previous segment's PNG (passed as a reference image): "the leftmost ~10% of THIS segment must continue the trees / hills / silhouettes from the right edge of the previous segment".
- Forbids horizon-line landscape (that's far) and foreground props (that's near).

References passed to the model:
- `assets/concept/style-sheet.png` (universal style anchor)
- `assets/scenes/forest-tutorial/concept.png` (scene anchor)
- For segment ≥ 1: `assets/scenes/forest-tutorial/bg-mid/segments/seg-NNN.png` (the previous segment — seam anchor)
- `assets/scenes/forest-tutorial/bg-far/final.png` (sibling-below — palette/lighting at the layer seam)

## Why each segment waits on the previous

The `inputs:` list declares the previous segment's PNG. The runner blocks until that file exists, which serializes generation (seg-001 → seg-002 → … → seg-N). Generation can't be parallelized because the seam-anchor reference is what keeps adjacent segments visually continuous.