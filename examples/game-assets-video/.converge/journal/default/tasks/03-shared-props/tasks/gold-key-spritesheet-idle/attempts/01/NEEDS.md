# Needs: 03-shared-props/gold-key-spritesheet-idle

## Description

Idle animation sprite sheet for Gold Key

## Expected Outputs

- `assets/objects/gold-key/spritesheets/idle/idle.png`
- `assets/objects/gold-key/spritesheets/idle/idle.atlas.json`
- `assets/objects/gold-key/spritesheets/idle/idle.prompt.txt`

## Checks

- **prop-spritesheet-png-exists-and-large**: Prop sheet PNG exists with reasonable dimensions (>=512x256)
- **prop-atlas-json-matches-png**: Prop atlas JSON's grid + sheet_size match the PNG (auto-detected layout)
- **prop-prompt-saved**: Sibling .prompt.txt exists for debugging
