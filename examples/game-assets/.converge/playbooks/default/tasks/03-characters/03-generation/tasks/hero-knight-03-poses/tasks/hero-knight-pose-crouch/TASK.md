---
id: hero-knight-pose-crouch
title: Generate Sir Aldric crouch pose
description: Crouch pose for Sir Aldric
tags:
  - character
  - pose
outputs:
  - assets/characters/hero-knight/variants/crouch/crouch.png
checks:
  - id: pose-exists
    description: Pose image exists
    cmd: test -s assets/characters/hero-knight/variants/crouch/crouch.png
vars:
  char_id: hero-knight
  char_name: Sir Aldric
  char_description: "Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement."
  palette: "16-bit retro, blue and silver armor, red accent, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  pose_name: crouch
  pose_description: Crouch pose for Sir Aldric
---

# Generate Sir Aldric crouch Pose

Create crouch pose variation for Sir Aldric.

## Character Details

- **ID**: hero-knight
- **Name**: Sir Aldric
- **Pose**: crouch
- **Palette**: 16-bit retro, blue and silver armor, red accent, limited to 16 colors

## Task

Generate crouch pose reference image:
- Consistent with character design
- Clear silhouette
- Appropriate for game mechanics

## Output

Create `assets/characters/hero-knight/variants/crouch/crouch.png`:
- PNG format
- Matches character palette
- Ready for animation
- Each variant in its own subdirectory

## Verification

- Pose image exists
- Matches character style
- Clear and readable
