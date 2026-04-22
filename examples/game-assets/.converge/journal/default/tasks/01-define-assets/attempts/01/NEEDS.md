# Needs: 01-define-assets

## Description

Read idea.md describing game and required assets. Parse into type-specific manifests: sprites.json (characters), objects.json, tile_maps.json, backgrounds.json. Each manifest contains id, name, description, palette, and animation_states/states.

## Inputs

- `idea.md`

## Expected Outputs

- `sprites.json`
- `objects.json`
- `tile_maps.json`
- `backgrounds.json`

## Checks

- **sprites-json-exists**: sprites.json written
- **objects-json-exists**: objects.json written
- **tilemaps-json-exists**: tile_maps.json written
- **backgrounds-json-exists**: backgrounds.json written
