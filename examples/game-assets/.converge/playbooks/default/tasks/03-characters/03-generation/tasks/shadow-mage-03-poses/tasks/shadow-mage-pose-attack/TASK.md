---
id: shadow-mage-pose-attack
title: Generate Malachar attack pose
description: Attack pose for Malachar
tags:
  - character
  - pose
outputs:
  - assets/characters/shadow-mage/variants/attack/attack.png
checks:
  - id: pose-exists
    description: Pose image exists
    cmd: test -s assets/characters/shadow-mage/variants/attack/attack.png
vars:
  char_id: shadow-mage
  char_name: Malachar
  char_description: "Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations."
  palette: "16-bit retro, dark purple and black, magical glow effects, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  pose_name: attack
  pose_description: Attack pose for Malachar
---

# Generate Malachar attack Pose

Create attack pose variation for Malachar.

## Character Details

- **ID**: shadow-mage
- **Name**: Malachar
- **Pose**: attack
- **Palette**: 16-bit retro, dark purple and black, magical glow effects, limited to 16 colors

## Task

Generate attack pose reference image:
- Consistent with character design
- Clear silhouette
- Appropriate for game mechanics

## Output

Create `assets/characters/shadow-mage/variants/attack/attack.png`:
- PNG format
- Matches character palette
- Ready for animation
- Each variant in its own subdirectory

## Verification

- Pose image exists
- Matches character style
- Clear and readable
