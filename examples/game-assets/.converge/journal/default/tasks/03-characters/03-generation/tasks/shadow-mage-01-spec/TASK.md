---
id: shadow-mage-01-spec
title: Validate Malachar specification
description: "Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations."
tags:
  - character
  - spec
outputs:
  - assets/characters/shadow-mage/SPEC.md
checks:
  - id: spec-exists
    description: Spec file exists
    cmd: test -s assets/characters/shadow-mage/SPEC.md
vars:
  char_id: shadow-mage
  char_name: Malachar
  char_description: "Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations."
  palette: "16-bit retro, dark purple and black, magical glow effects, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Validate Malachar Specification

Ensure character specification is complete and ready for generation.

## Character Details

- **ID**: shadow-mage
- **Name**: Malachar
- **Description**: Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations.
- **Palette**: 16-bit retro, dark purple and black, magical glow effects, limited to 16 colors
- **Animation States**: ["idle","walk"]

## Task

Validate and create character specification file:
- Verify all required fields are present
- Ensure animation states are defined
- Confirm palette guidelines are clear

## Output

Create or validate `assets/characters/shadow-mage/SPEC.md` with:
- Character description
- Visual style guidelines
- Animation requirements
- Technical specifications

## Verification

- SPEC.md exists and is complete
- All animation states are documented
- Palette is clearly defined
