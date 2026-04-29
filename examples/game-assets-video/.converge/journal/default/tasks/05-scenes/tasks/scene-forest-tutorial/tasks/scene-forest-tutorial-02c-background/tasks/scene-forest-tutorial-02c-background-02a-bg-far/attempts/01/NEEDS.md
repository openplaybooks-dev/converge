# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02a-bg-far

## Description

Distant landscape: sky → mountains → horizon line. Fully opaque, fills the canvas. Composes behind everything else.

## Inputs

- `assets/scenes/forest-tutorial/concept.png`
- `assets/scenes/forest-tutorial/scene-plan.json`
- `assets/scenes/forest-tutorial/stage.json`
- `assets/scenes/forest-tutorial/map.silhouette.png`
- `assets/concept/style-sheet.png`
- `assets/visual-target.png`

## Expected Outputs

- `assets/scenes/forest-tutorial/bg-far/final.png`
- `assets/scenes/forest-tutorial/bg-far/final.atlas.json`

## Checks

- **bg-far-png-exists**: bg-far.png exists
- **bg-far-atlas-exists**: bg-far.atlas.json exists
- **bg-far-is-fully-opaque**: bg-far is the back wall — must be fully opaque
