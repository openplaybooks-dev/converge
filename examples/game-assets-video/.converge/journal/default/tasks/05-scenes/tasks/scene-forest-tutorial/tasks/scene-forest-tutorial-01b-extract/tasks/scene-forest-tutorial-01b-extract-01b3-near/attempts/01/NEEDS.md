# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b3-near

## Description

Extract the NEAR parallax layer as a chroma-keyed RGBA image. Near is the foreground edge — content concentrated in the bottom strip, chroma-green above. Waits on bg-mid for sibling-above palette anchor.

## Inputs

- `assets/scenes/forest-tutorial/concept.png`
- `assets/scenes/forest-tutorial/extracted/bg-mid.png`

## Expected Outputs

- `assets/scenes/forest-tutorial/extracted/bg-near.png`

## Checks

- **bg-near-extracted-exists**: bg-near extraction PNG was written
- **bg-near-extracted-irregular-alpha**: bg-near has per-pixel irregular alpha and majority transparent area (foreground only in bottom strip)
- **bg-near-extracted-no-band-marker**: prompt sidecar is a real model pass
