# Needs: 03-shared-props/ui-key-slot-spritesheet-idle

## Description

Idle animation sprite sheet for User Interface Slot For The Gold Key

## Expected Outputs

- `assets/objects/ui-key-slot/spritesheets/idle/idle.png`
- `assets/objects/ui-key-slot/spritesheets/idle/idle.atlas.json`
- `assets/objects/ui-key-slot/spritesheets/idle/idle.prompt.txt`

## Checks

- **prop-spritesheet-png-exists-and-large**: Prop sheet PNG exists with reasonable dimensions (>=512x256)
- **prop-atlas-json-matches-png**: Prop atlas JSON's grid + sheet_size match the PNG (1x1 for static props, NxM for animated)
- **prop-prompt-saved**: Sibling .prompt.txt exists for debugging
