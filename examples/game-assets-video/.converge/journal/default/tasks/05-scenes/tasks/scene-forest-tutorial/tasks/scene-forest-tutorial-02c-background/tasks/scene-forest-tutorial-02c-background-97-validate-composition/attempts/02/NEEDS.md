# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-97-validate-composition

## Description

Composite bg-far + bg-mid + bg-near and ask Gemini whether the three layers tell a coherent visual story. Catches cross-layer issues that per-layer validators miss: elevation mismatch, palette drift, content collision, blocking.

## Inputs

- `assets/scenes/forest-tutorial/stage.json`
- `assets/scenes/forest-tutorial/concept.png`
- `assets/scenes/forest-tutorial/map.silhouette.png`
- `assets/scenes/forest-tutorial/bg-far/final.png`
- `assets/scenes/forest-tutorial/bg-mid/final.png`
- `assets/scenes/forest-tutorial/bg-far/final.png`

## Expected Outputs

- `assets/scenes/forest-tutorial/bg-composition.critique.json`
- `assets/scenes/forest-tutorial/bg-composition.preview.png`

## Checks

- **bg-composition-critique-written**: cross-layer critique JSON was written
- **bg-composition-no-high-severity**: no layer was flagged with severity=high (low-severity issues are accepted)
