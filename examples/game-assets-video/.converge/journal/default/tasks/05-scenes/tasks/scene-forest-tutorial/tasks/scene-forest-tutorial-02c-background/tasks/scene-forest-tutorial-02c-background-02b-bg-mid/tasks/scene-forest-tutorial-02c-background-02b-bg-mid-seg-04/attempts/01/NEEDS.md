# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02b-bg-mid/scene-forest-tutorial-02c-background-02b-bg-mid-seg-04

## Description

One slice of the wide bg-mid layer. Anchored on the previous segment so the seam matches.

## Inputs

- `assets/scenes/forest-tutorial/concept.png`
- `assets/scenes/forest-tutorial/scene-plan.json`
- `assets/scenes/forest-tutorial/stage.json`
- `assets/scenes/forest-tutorial/map.silhouette.png`
- `assets/concept/style-sheet.png`
- `assets/scenes/forest-tutorial/bg-far/final.png`
- `assets/scenes/forest-tutorial/bg-mid/segments/seg-002.png`

## Expected Outputs

- `assets/scenes/forest-tutorial/bg-mid/segments/seg-003.png`

## Checks

- **bg-mid-seg-png-exists**: bg-mid segment PNG written
- **bg-mid-seg-stacking-shape**: segment follows green-screen stacking contract — top half mostly chroma green (far shows through after composition), bottom half solid mid content (near covers it later), horizon irregular
