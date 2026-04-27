---
id: "{{char_id}}-01-spec"
title: "Validate {{char_name}} specification"
description: "{{char_description}}"
outputs:
  - "assets/characters/{{char_id}}/SPEC.md"
checks:
  - id: spec-exists
    cmd: test -s assets/characters/{{char_id}}/SPEC.md
    description: Spec file exists
tags:
  - character
  - spec
---

# Validate {{char_name}} Specification

Ensure character specification is complete and ready for generation.

## Character Details

- **ID**: {{char_id}}
- **Name**: {{char_name}}
- **Description**: {{char_description}}
- **Palette**: {{palette}}
- **Animation States**: {{animation_states}}

## Task

Validate and create character specification file:
- Verify all required fields are present
- Ensure animation states are defined
- Confirm palette guidelines are clear

## Output

Create or validate `assets/characters/{{char_id}}/SPEC.md` with:
- Character description
- Visual style guidelines
- Animation requirements
- Technical specifications

## Verification

- SPEC.md exists and is complete
- All animation states are documented
- Palette is clearly defined
