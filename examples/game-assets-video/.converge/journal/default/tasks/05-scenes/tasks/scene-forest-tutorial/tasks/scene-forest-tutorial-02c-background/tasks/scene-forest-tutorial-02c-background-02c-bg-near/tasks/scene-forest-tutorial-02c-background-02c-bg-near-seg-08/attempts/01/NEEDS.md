# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02c-bg-near/scene-forest-tutorial-02c-background-02c-bg-near-seg-08

## Description

One slice of the wide bg-near layer. Anchored on the previous segment so the seam matches.

## Inputs

- `assets/scenes/forest-tutorial/concept.png`
- `assets/scenes/forest-tutorial/scene-plan.json`
- `assets/scenes/forest-tutorial/stage.json`
- `assets/scenes/forest-tutorial/map.silhouette.png`
- `assets/concept/style-sheet.png`
- `assets/scenes/forest-tutorial/bg-mid.png`
- `assets/scenes/forest-tutorial/bg-near/seg-006.png`

## Expected Outputs

- `assets/scenes/forest-tutorial/bg-near/seg-007.png`

## Checks

- **bg-near-seg-png-exists**: bg-near segment PNG written
- **bg-near-seg-content-in-bottom-strip**: segment has foreground strip in the bottom; top is transparent
