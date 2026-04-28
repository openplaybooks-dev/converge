# Needs: 03-shared-props/checkpoint-flag-spritesheet-idle

## Description

Idle animation sprite sheet for Checkpoint Flag

## Expected Outputs

- `assets/objects/checkpoint-flag/spritesheets/idle/idle.png`
- `assets/objects/checkpoint-flag/spritesheets/idle/idle.atlas.json`
- `assets/objects/checkpoint-flag/spritesheets/idle/idle.prompt.txt`

## Checks

- **prop-spritesheet-png-exists-and-large**: Prop sheet PNG exists with reasonable dimensions (>=512x256)
- **prop-atlas-json-matches-png**: Prop atlas JSON's grid + sheet_size match the PNG (auto-detected layout)
- **prop-prompt-saved**: Sibling .prompt.txt exists for debugging
