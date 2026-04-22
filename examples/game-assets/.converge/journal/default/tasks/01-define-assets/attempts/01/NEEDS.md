# Needs: 01-define-assets

## Description

Read idea.md describing game and required assets. Parse into type-specific manifests: sprites.json (characters), objects.json, tile_maps.json, backgrounds.json. Each manifest contains id, name, description, palette, and animation_states/states.

## Inputs

- `idea.md`

## Expected Outputs

- `assets/sprites.json`
- `assets/objects.json`
- `assets/tile_maps.json`
- `assets/backgrounds.json`

## Checks

- **sprites-json-exists**: assets/sprites.json written
- **objects-json-exists**: assets/objects.json written
- **tilemaps-json-exists**: assets/tile_maps.json written
- **backgrounds-json-exists**: assets/backgrounds.json written
