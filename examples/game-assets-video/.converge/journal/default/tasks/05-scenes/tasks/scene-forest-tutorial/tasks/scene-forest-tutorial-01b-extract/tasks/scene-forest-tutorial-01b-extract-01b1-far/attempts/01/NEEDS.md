# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b1-far

## Description

Extract the FAR parallax layer as a fully-opaque RGB image. Far is the back wall — it has no transparency, no chroma-key, no green pixels. Amodal-completed by repainting what's behind any mid/near occluders.

## Inputs

- `assets/scenes/forest-tutorial/concept.png`

## Expected Outputs

- `assets/scenes/forest-tutorial/extracted/bg-far.png`

## Checks

- **bg-far-extracted-exists**: bg-far extraction PNG was written
- **bg-far-extracted-fully-opaque**: bg-far is the back wall — every pixel must be alpha=255 (no transparency at all)
- **bg-far-extracted-no-chroma-green**: bg-far has zero pure-green pixels (no chroma-key markers leaked through)
- **bg-far-extracted-no-band-marker**: prompt sidecar is a real model pass (not a hand-rolled band slice)
