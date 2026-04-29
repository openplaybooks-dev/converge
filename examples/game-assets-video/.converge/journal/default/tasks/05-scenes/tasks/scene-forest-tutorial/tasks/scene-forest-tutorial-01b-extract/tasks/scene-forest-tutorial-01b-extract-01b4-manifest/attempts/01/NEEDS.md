# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b4-manifest

## Description

Vision-pass JSON manifest describing each layer's palette, subject_height_tiles, and feature density. Merges back into scenes.json[forest-tutorial].background.layers[]. Waits on all three layer extractions.

## Inputs

- `assets/scenes/forest-tutorial/concept.png`
- `assets/scenes/forest-tutorial/extracted/bg-far.png`
- `assets/scenes/forest-tutorial/extracted/bg-mid.png`
- `assets/scenes/forest-tutorial/extracted/bg-near.png`

## Expected Outputs

- `assets/scenes/forest-tutorial/extracted/manifest.json`

## Checks

- **bg-manifest-exists**: manifest.json was written
- **bg-manifest-has-three-layers**: manifest contains all three layer entries (far / mid / near)
