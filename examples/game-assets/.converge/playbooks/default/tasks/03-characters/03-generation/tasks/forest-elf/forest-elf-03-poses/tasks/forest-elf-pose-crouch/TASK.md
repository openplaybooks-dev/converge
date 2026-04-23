---
id: forest-elf-pose-crouch
title: Generate Lirael crouch pose
description: Crouch pose for Lirael
tags:
  - character
  - pose
outputs:
  - assets/characters/forest-elf/variants/crouch/crouch.png
checks:
  - id: pose-exists
    description: Pose image exists
    cmd: test -s assets/characters/forest-elf/variants/crouch/crouch.png
vars:
  char_id: forest-elf
  char_name: Lirael
  char_description: "Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses."
  palette: "16-bit retro, green and brown tones, natural forest colors, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  pose_name: crouch
  pose_description: Crouch pose for Lirael
---

# Generate Lirael crouch Pose

Create crouch pose variation for Lirael.

## Character Details

- **ID**: forest-elf
- **Name**: Lirael
- **Pose**: crouch
- **Palette**: 16-bit retro, green and brown tones, natural forest colors, limited to 16 colors

## Task

Generate crouch pose reference image:
- Consistent with character design
- Clear silhouette
- Appropriate for game mechanics

## Output

Create `assets/characters/forest-elf/variants/crouch/crouch.png`:
- PNG format
- Matches character palette
- Ready for animation
- Each variant in its own subdirectory

## Verification

- Pose image exists
- Matches character style
- Clear and readable
