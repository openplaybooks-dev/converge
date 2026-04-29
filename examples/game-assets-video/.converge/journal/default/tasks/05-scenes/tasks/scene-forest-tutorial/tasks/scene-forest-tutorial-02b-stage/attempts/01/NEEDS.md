# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02b-stage

## Description

Design the playable area as N chunks left-to-right. The blueprint everyone downstream reads: world width/height in tiles, per-chunk ground type and scene props, computed background dimensions.

## Inputs

- `assets/scenes/forest-tutorial/scene-plan.json`
- `assets/scenes/forest-tutorial/SPEC.md`
- `assets/scenes.json`
- `assets/game.json`

## Expected Outputs

- `assets/scenes/forest-tutorial/stage.json`
- `assets/scenes/forest-tutorial/map.silhouette.png`

## Checks

- **stage-json-exists**: stage.json was written
- **stage-silhouette-exists**: map.silhouette.png was rendered
- **stage-json-has-required-shape**: stage.json schema is valid — world, chunks, elevation, beats, platforms, hazards, background sizing
- **stage-silhouette-not-tiny**: silhouette PNG is wide and large enough to be useful as a downstream reference
