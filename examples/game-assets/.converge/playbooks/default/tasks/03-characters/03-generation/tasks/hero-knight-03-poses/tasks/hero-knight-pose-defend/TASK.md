---
id: hero-knight-pose-defend
title: Generate Sir Aldric defend pose
description: Defend pose for Sir Aldric
tags:
  - character
  - pose
outputs:
  - assets/characters/hero-knight/variants/defend/defend.png
checks:
  - id: pose-exists
    description: Pose image exists
    cmd: test -s assets/characters/hero-knight/variants/defend/defend.png
vars:
  char_id: hero-knight
  char_name: Sir Aldric
  char_description: "Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement."
  palette: "16-bit retro, blue and silver armor, red accent, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
  pose_name: defend
  pose_description: Defend pose for Sir Aldric
---

# Generate Sir Aldric defend Pose

Create defend pose variation for Sir Aldric.

## Character Details

- **ID**: hero-knight
- **Name**: Sir Aldric
- **Pose**: defend
- **Palette**: 16-bit retro, blue and silver armor, red accent, limited to 16 colors

## Task

Generate defend pose reference image:
- Consistent with character design
- Clear silhouette
- Appropriate for game mechanics

## Output

Create `assets/characters/hero-knight/variants/defend/defend.png`:
- PNG format
- Matches character palette
- Ready for animation
- Each variant in its own subdirectory

## Verification

- Pose image exists
- Matches character style
- Clear and readable
