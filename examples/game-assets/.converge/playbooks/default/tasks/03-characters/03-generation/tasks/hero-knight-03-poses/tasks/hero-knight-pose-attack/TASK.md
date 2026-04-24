---
id: hero-knight-pose-attack
title: Generate Sir Aldric attack pose
description: Attack pose for Sir Aldric
tags:
  - character
  - pose
outputs:
  - assets/characters/hero-knight/variants/attack/attack.png
checks:
  - id: pose-exists
    description: Pose image exists
    cmd: test -s assets/characters/hero-knight/variants/attack/attack.png
vars:
  char_id: hero-knight
  char_name: Sir Aldric
  char_description: "Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement."
  palette: "16-bit retro, blue and silver armor, red accent, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  pose_name: attack
  pose_description: Attack pose for Sir Aldric
---

# Generate Sir Aldric attack Pose

Create attack pose variation for Sir Aldric.

## Character Details

- **ID**: hero-knight
- **Name**: Sir Aldric
- **Pose**: attack
- **Palette**: 16-bit retro, blue and silver armor, red accent, limited to 16 colors

## Task

Generate attack pose reference image:
- Consistent with character design
- Clear silhouette
- Appropriate for game mechanics

## Output

Create `assets/characters/hero-knight/variants/attack/attack.png`:
- PNG format
- Matches character palette
- Ready for animation
- Each variant in its own subdirectory

## Verification

- Pose image exists
- Matches character style
- Clear and readable
