# Needs: 05-export-ready

## Description

Slice sprite sheets into individual frames, generate atlas metadata (atlas.json, atlas.godot.json, atlas.unity.json), output to assets/{category}/{id}/ with engine-ready formats.

## Inputs

- `sprites.json`
- `spritesheets/**/{state}.png`
- `spritesheets/**/{state}.frames.json`
- `objects.json`
- `objectsheets/**/*.png`
- `keyframes/**/*.png`

## Expected Outputs

- `assets/characters/**/*.png`
- `assets/characters/**/atlas.json`
- `assets/characters/**/atlas.godot.json`
- `assets/characters/**/atlas.unity.json`
- `assets/objects/**/*.png`
- `assets/objects/**/atlas.json`
- `assets/backgrounds/**/*.png`
- `assets/tile_maps/**/*.png`

## Checks

- **assets-generated**: At least one asset was exported
- **atlas-json-valid**: Atlas JSON is valid
