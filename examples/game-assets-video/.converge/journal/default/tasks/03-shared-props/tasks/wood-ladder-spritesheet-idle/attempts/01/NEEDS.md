# Needs: 03-shared-props/wood-ladder-spritesheet-idle

## Description

Idle animation sprite sheet for Wooden Ladder

## Expected Outputs

- `assets/objects/wood-ladder/spritesheets/idle/idle.png`
- `assets/objects/wood-ladder/spritesheets/idle/idle.atlas.json`
- `assets/objects/wood-ladder/spritesheets/idle/idle.prompt.txt`

## Checks

- **prop-spritesheet-png-exists-and-large**: Prop sheet PNG exists with reasonable dimensions (>=512x256)
- **prop-atlas-json-matches-png**: Prop atlas JSON's grid + sheet_size match the PNG (auto-detected layout)
- **prop-prompt-saved**: Sibling .prompt.txt exists for debugging
