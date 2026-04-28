# Needs: 03-shared-props/gold-key-spritesheet-collect

## Description

Collect animation sprite sheet for Gold Key

## Expected Outputs

- `assets/objects/gold-key/spritesheets/collect/collect.png`
- `assets/objects/gold-key/spritesheets/collect/collect.atlas.json`
- `assets/objects/gold-key/spritesheets/collect/collect.prompt.txt`

## Checks

- **prop-spritesheet-png-exists-and-large**: Prop sheet PNG exists with reasonable dimensions (>=512x256)
- **prop-atlas-json-matches-png**: Prop atlas JSON's grid + sheet_size match the PNG (auto-detected layout)
- **prop-prompt-saved**: Sibling .prompt.txt exists for debugging
