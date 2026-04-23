---
id: forest-elf-02-angles
title: Generate Lirael angle references
description: Create reference images for all viewing angles
tags:
  - character
  - reference
outputs:
  - assets/characters/forest-elf/ref/angles/angles.json
  - assets/characters/forest-elf/ref/angles/front.png
  - assets/characters/forest-elf/ref/angles/side_left.png
  - assets/characters/forest-elf/ref/angles/side_right.png
  - assets/characters/forest-elf/ref/angles/back.png
checks:
  - id: angles-exist
    description: Angle references exist
    cmd: test -s assets/characters/forest-elf/ref/angles/angles.json
vars:
  char_id: forest-elf
  char_name: Lirael
  char_description: "Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses."
  palette: "16-bit retro, green and brown tones, natural forest colors, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Generate Lirael Angle References

Create reference images for all viewing angles needed for 8-directional movement.

## Character Details

- **ID**: forest-elf
- **Name**: Lirael
- **Palette**: 16-bit retro, green and brown tones, natural forest colors, limited to 16 colors

## Task

Generate reference images for key angles:
- Front view (facing camera)
- Side view (profile)
- Back view
- 3/4 views as needed

## Output

Create reference images in `assets/characters/forest-elf/ref/angles/`:
- `front.png` - Front-facing reference
- `side_left.png` - Left side profile reference
- `side_right.png` - Right side profile reference
- `back.png` - Back view reference
- `angles.json` - Metadata for all angles

## Verification

- All angle reference images exist
- Images match character specification
- Consistent with palette guidelines
