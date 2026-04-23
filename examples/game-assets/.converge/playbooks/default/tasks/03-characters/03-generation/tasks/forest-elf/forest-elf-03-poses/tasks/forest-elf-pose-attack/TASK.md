---
id: forest-elf-pose-attack
title: Generate Lirael attack pose
description: Attack pose for Lirael
tags:
  - character
  - pose
outputs:
  - assets/characters/forest-elf/variants/attack/attack.png
checks:
  - id: pose-exists
    description: Pose image exists
    cmd: test -s assets/characters/forest-elf/variants/attack/attack.png
vars:
  char_id: forest-elf
  char_name: Lirael
  char_description: "Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses."
  palette: "16-bit retro, green and brown tones, natural forest colors, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  pose_name: attack
  pose_description: Attack pose for Lirael
---

# Generate Lirael attack Pose

Create attack pose variation for Lirael.

## Character Details

- **ID**: forest-elf
- **Name**: Lirael
- **Pose**: attack
- **Palette**: 16-bit retro, green and brown tones, natural forest colors, limited to 16 colors

## Task

Generate attack pose reference image:
- Consistent with character design
- Clear silhouette
- Appropriate for game mechanics

## Output

Create `assets/characters/forest-elf/variants/attack/attack.png`:
- PNG format
- Matches character palette
- Ready for animation
- Each variant in its own subdirectory

## Verification

- Pose image exists
- Matches character style
- Clear and readable
