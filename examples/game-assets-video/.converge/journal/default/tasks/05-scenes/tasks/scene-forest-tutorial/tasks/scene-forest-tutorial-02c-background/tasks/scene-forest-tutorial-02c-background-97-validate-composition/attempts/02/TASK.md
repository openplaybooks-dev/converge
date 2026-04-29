# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-97-validate-composition

# Scene `forest-tutorial` — cross-layer composition validate

## Role

You are a **paid-API operator**. Run the script and report its real result.

## What this does

Composites every per-layer stitched output into one image and asks Gemini to judge whether the three layers tell a coherent visual story together. Catches issues per-layer validators can't:

- **elevation-mismatch** — far horizon, mid silhouette base, and near foreground edge disagree on the ground line.
- **palette-drift** — saturation / hue jumps between layers.
- **content-collision** — mid silhouettes overlap the foreground edge or far peaks poke through mid.
- **style-drift** — line weight or shading style differs.
- **blocking** — a layer obscures the playable area.

If verdict is `pass`, this task succeeds and the run moves on.

If a layer is flagged with `severity=high`, the script deletes the layer's stitched PNG and clears its segment files; the runner re-runs the segment + stitch chain for that layer. The critique JSON is preserved so the next per-layer validator pass can read it.

## Run

```bash
python scripts/validate_bg_composition.py forest-tutorial
```

## Cost

- 1 text-out call per pass (~5¢).
- Each iteration that flags a layer adds N image-gen calls (one per segment) plus the per-layer validator + stitch.