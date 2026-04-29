# Needs: 00-classify-game

## Description

Read idea.md (and visual-target.png if present) to classify the game into one of the supported types and write assets/game.json. Every downstream task reads game.json to decide which asset categories to produce or skip.

## Expected Outputs

- `assets/game.json`
- `assets/game.notes.md`

## Checks

- **game-json-exists**: assets/game.json was written
- **game-type-valid**: game.json declares a recognized game_type and has asset_categories
