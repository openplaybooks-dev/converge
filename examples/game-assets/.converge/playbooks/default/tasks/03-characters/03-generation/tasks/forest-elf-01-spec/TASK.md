---
id: forest-elf-01-spec
title: Validate Lirael specification
description: "Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses."
tags:
  - character
  - spec
outputs:
  - assets/characters/forest-elf/SPEC.md
checks:
  - id: spec-exists
    description: Spec file exists
    cmd: test -s assets/characters/forest-elf/SPEC.md
vars:
  char_id: forest-elf
  char_name: Lirael
  char_description: "Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses."
  palette: "16-bit retro, green and brown tones, natural forest colors, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Validate Lirael Specification

Ensure character specification is complete and ready for generation.

## Character Details

- **ID**: forest-elf
- **Name**: Lirael
- **Description**: Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses.
- **Palette**: 16-bit retro, green and brown tones, natural forest colors, limited to 16 colors
- **Animation States**: ["idle","walk"]

## Task

Validate and create character specification file:
- Verify all required fields are present
- Ensure animation states are defined
- Confirm palette guidelines are clear

## Output

Create or validate `assets/characters/forest-elf/SPEC.md` with:
- Character description
- Visual style guidelines
- Animation requirements
- Technical specifications

## Verification

- SPEC.md exists and is complete
- All animation states are documented
- Palette is clearly defined
