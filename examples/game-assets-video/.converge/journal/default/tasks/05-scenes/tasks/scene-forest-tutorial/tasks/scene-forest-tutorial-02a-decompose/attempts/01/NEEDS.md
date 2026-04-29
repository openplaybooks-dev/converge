# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02a-decompose

## Description

Multi-modal text-out reads concept + extracted layers and writes the structured plan that drives every per-asset spec/generate call.

## Inputs

- `assets/scenes/forest-tutorial/concept.png`
- `assets/scenes/forest-tutorial/extracted/manifest.json`

## Expected Outputs

- `assets/scenes/forest-tutorial/scene-plan.json`

## Checks

- **scene-plan-exists**: scene-plan.json was written
- **scene-plan-has-layers-and-tiles**: scene-plan has bg.layers (each with regions) and tilesheet.tiles
