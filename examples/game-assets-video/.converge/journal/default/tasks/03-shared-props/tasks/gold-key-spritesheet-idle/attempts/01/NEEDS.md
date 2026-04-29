# Needs: 03-shared-props/gold-key-spritesheet-idle

## Description

Idle animation sprite sheet for Ornate Golden Key With Gem Inset

## Expected Outputs

- `assets/objects/gold-key/spritesheets/idle/idle.png`
- `assets/objects/gold-key/spritesheets/idle/idle.atlas.json`
- `assets/objects/gold-key/spritesheets/idle/idle.prompt.txt`

## Checks

- **prop-spritesheet-png-exists-and-large**: Prop sheet PNG exists with reasonable dimensions (>=512x256)
- **prop-atlas-json-matches-png**: Prop atlas JSON's grid + sheet_size match the PNG (1x1 for static props, NxM for animated)
- **prop-prompt-saved**: Sibling .prompt.txt exists for debugging
