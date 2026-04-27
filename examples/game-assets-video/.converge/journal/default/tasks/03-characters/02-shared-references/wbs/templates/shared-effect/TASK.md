---
id: "effect-{{effect_name}}"
title: "Generate {{effect_name}} shared effect"
description: "{{effect_description}}"
outputs:
  - "assets/shared/effects/{{effect_name}}.png"
  - "assets/shared/effects/{{effect_name}}.json"
checks:
  - id: effect-exists
    cmd: test -s assets/shared/effects/{{effect_name}}.png
    description: Effect image exists
tags:
  - shared
  - effect
---

# Generate {{effect_name}} Shared Effect

Create a shared visual effect that can be reused across multiple characters.

## Effect Details

- **Name**: {{effect_name}}
- **Description**: {{effect_description}}

## Task

Generate visual effect asset that can be composited onto characters:
- Transparent background
- Reusable across multiple characters
- Consistent with art style

## Output

Generate `assets/shared/effects/{{effect_name}}.png`:
- PNG with transparency
- Appropriate resolution for compositing
- Matches game art style

Generate `assets/shared/effects/{{effect_name}}.json`:
```json
{
  "name": "{{effect_name}}",
  "description": "{{effect_description}}",
  "usage": "Composite onto character sprites",
  "blend_mode": "additive"
}
```

## Verification

- Effect image has transparent background
- Can be composited onto character sprites
- Matches overall art style
