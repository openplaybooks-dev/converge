# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02b-bg-mid/97-validate

## Description

Composite the per-segment PNGs and ask Gemini for a structured critique. If issues are flagged, the corresponding segments are deleted so the runner re-runs them; the critique becomes additional prompt context for the regen.

## Inputs

- `assets/scenes/forest-tutorial/stage.json`
- `assets/scenes/forest-tutorial/concept.png`
- `assets/scenes/forest-tutorial/map.silhouette.png`
- `assets/scenes/forest-tutorial/bg-mid/segments/seg-*.png`

## Expected Outputs

- `assets/scenes/forest-tutorial/bg-mid/critique/critique.json`

## Checks

- **bg-mid-critique-written**: critique JSON was written
- **bg-mid-validator-no-high-severity**: no segment was flagged with severity=high (low-severity issues are accepted)
