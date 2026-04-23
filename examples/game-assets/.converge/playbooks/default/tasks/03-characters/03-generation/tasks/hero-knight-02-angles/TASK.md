---
id: hero-knight-02-angles
title: Generate Sir Aldric angle references
description: Create reference images for all viewing angles
tags:
  - character
  - reference
outputs:
  - assets/characters/hero-knight/ref/angles/angles.json
  - assets/characters/hero-knight/ref/angles/front.png
  - assets/characters/hero-knight/ref/angles/side_left.png
  - assets/characters/hero-knight/ref/angles/side_right.png
  - assets/characters/hero-knight/ref/angles/back.png
checks:
  - id: angles-exist
    description: Angle references exist
    cmd: test -s assets/characters/hero-knight/ref/angles/angles.json
vars:
  char_id: hero-knight
  char_name: Sir Aldric
  char_description: "Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement."
  palette: "16-bit retro, blue and silver armor, red accent, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Generate Sir Aldric Angle References

Create reference images for all viewing angles needed for 8-directional movement.

## Character Details

- **ID**: hero-knight
- **Name**: Sir Aldric
- **Palette**: 16-bit retro, blue and silver armor, red accent, limited to 16 colors

## Task

Generate reference images for key angles:
- Front view (facing camera)
- Side view (profile)
- Back view
- 3/4 views as needed

## Output

Create reference images in `assets/characters/hero-knight/ref/angles/`:
- `front.png` - Front-facing reference
- `side_left.png` - Left side profile reference
- `side_right.png` - Right side profile reference
- `back.png` - Back view reference
- `angles.json` - Metadata for all angles

## Verification

- All angle reference images exist
- Images match character specification
- Consistent with palette guidelines
