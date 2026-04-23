---
id: hero-knight-01-spec
title: Validate Sir Aldric specification
description: "Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement."
tags:
  - character
  - spec
outputs:
  - assets/characters/hero-knight/SPEC.md
checks:
  - id: spec-exists
    description: Spec file exists
    cmd: test -s assets/characters/hero-knight/SPEC.md
vars:
  char_id: hero-knight
  char_name: Sir Aldric
  char_description: "Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement."
  palette: "16-bit retro, blue and silver armor, red accent, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Validate Sir Aldric Specification

Ensure character specification is complete and ready for generation.

## Character Details

- **ID**: hero-knight
- **Name**: Sir Aldric
- **Description**: Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement.
- **Palette**: 16-bit retro, blue and silver armor, red accent, limited to 16 colors
- **Animation States**: ["idle","walk"]

## Task

Validate and create character specification file:
- Verify all required fields are present
- Ensure animation states are defined
- Confirm palette guidelines are clear

## Output

Create or validate `assets/characters/hero-knight/SPEC.md` with:
- Character description
- Visual style guidelines
- Animation requirements
- Technical specifications

## Verification

- SPEC.md exists and is complete
- All animation states are documented
- Palette is clearly defined
