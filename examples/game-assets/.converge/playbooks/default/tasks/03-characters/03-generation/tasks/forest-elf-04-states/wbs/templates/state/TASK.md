---
id: "{{char_id}}-state-{{state_name}}"
title: "Generate {{char_name}} {{state_name}} animation"
description: "{{state_description}}"
outputs:
  - "spritesheets/{{char_id}}/{{state_name}}.png"
  - "spritesheets/{{char_id}}/{{state_name}}.atlas.json"
checks:
  - id: spritesheet-exists
    cmd: test -s spritesheets/{{char_id}}/{{state_name}}.png
    description: Spritesheet exists
tags:
  - character
  - animation
  - spritesheet
---

# Generate {{char_name}} {{state_name}} Animation

Create sprite sheet for {{state_name}} animation state.

## Character Details

- **ID**: {{char_id}}
- **Name**: {{char_name}}
- **Animation**: {{state_name}}
- **Palette**: {{palette}}

## Task

Generate complete sprite sheet for {{state_name}} animation:
- Multiple frames showing animation progression
- Consistent with character design
- Optimized for game engine

## Output

Create sprite sheet files:
- `spritesheets/{{char_id}}/{{state_name}}.png` - Packed sprite sheet
- `spritesheets/{{char_id}}/{{state_name}}.atlas.json` - Frame metadata

## Verification

- Sprite sheet exists and is complete
- Atlas JSON has correct frame data
- Animation loops smoothly
- Matches character palette
