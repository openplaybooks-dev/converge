---
id: "{{char_id}}-02-angles"
title: "Generate {{char_name}} angle references"
description: "Create reference images for all viewing angles"
outputs:
  - "assets/characters/{{char_id}}/ref/angles.json"
  - "assets/characters/{{char_id}}/ref/front.png"
  - "assets/characters/{{char_id}}/ref/side.png"
  - "assets/characters/{{char_id}}/ref/back.png"
checks:
  - id: angles-exist
    cmd: test -s assets/characters/{{char_id}}/ref/angles.json
    description: Angle references exist
tags:
  - character
  - reference
---

# Generate {{char_name}} Angle References

Create reference images for all viewing angles needed for 8-directional movement.

## Character Details

- **ID**: {{char_id}}
- **Name**: {{char_name}}
- **Palette**: {{palette}}

## Task

Generate reference images for key angles:
- Front view (facing camera)
- Side view (profile)
- Back view
- 3/4 views as needed

## Output

Create reference images in `assets/characters/{{char_id}}/ref/`:
- `front.png` - Front-facing reference
- `side.png` - Side profile reference
- `back.png` - Back view reference
- `angles.json` - Metadata for all angles

## Verification

- All angle reference images exist
- Images match character specification
- Consistent with palette guidelines
