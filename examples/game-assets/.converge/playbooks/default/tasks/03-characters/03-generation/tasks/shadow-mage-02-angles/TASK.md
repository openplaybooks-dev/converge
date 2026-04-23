---
id: shadow-mage-02-angles
title: Generate Malachar angle references
description: Create reference images for all viewing angles
tags:
  - character
  - reference
outputs:
  - assets/characters/shadow-mage/ref/angles/angles.json
  - assets/characters/shadow-mage/ref/angles/front.png
  - assets/characters/shadow-mage/ref/angles/side_left.png
  - assets/characters/shadow-mage/ref/angles/side_right.png
  - assets/characters/shadow-mage/ref/angles/back.png
checks:
  - id: angles-exist
    description: Angle references exist
    cmd: test -s assets/characters/shadow-mage/ref/angles/angles.json
vars:
  char_id: shadow-mage
  char_name: Malachar
  char_description: "Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations."
  palette: "16-bit retro, dark purple and black, magical glow effects, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Generate Malachar Angle References

Create reference images for all viewing angles needed for 8-directional movement.

## Character Details

- **ID**: shadow-mage
- **Name**: Malachar
- **Palette**: 16-bit retro, dark purple and black, magical glow effects, limited to 16 colors

## Task

Generate reference images for key angles:
- Front view (facing camera)
- Side view (profile)
- Back view
- 3/4 views as needed

## Output

Create reference images in `assets/characters/shadow-mage/ref/angles/`:
- `front.png` - Front-facing reference
- `side_left.png` - Left side profile reference
- `side_right.png` - Right side profile reference
- `back.png` - Back view reference
- `angles.json` - Metadata for all angles

## Verification

- All angle reference images exist
- Images match character specification
- Consistent with palette guidelines
