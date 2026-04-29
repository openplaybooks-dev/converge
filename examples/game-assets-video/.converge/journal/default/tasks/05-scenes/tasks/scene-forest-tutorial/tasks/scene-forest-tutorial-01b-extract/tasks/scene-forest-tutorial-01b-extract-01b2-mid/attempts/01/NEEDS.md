# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b2-mid

## Description

Extract the MID parallax layer as a chroma-keyed RGBA image. Mid is the silhouette band — content occupies a horizontal band, with chroma-green outside (keyed to alpha=0). Waits on bg-far for sibling-below palette anchor.

## Inputs

- `assets/scenes/forest-tutorial/concept.png`
- `assets/scenes/forest-tutorial/extracted/bg-far.png`

## Expected Outputs

- `assets/scenes/forest-tutorial/extracted/bg-mid.png`

## Checks

- **bg-mid-extracted-exists**: bg-mid extraction PNG was written
- **bg-mid-extracted-irregular-alpha**: bg-mid has per-pixel irregular alpha and meaningful transparent area
- **bg-mid-extracted-no-band-marker**: prompt sidecar is a real model pass (not a hand-rolled band slice)
