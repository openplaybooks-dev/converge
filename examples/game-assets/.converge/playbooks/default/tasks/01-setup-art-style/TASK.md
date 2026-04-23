---
title: Setup Art Style
description: Validate configuration and create templates
outputs:
  - "assets/sprites.json"
  - ".templates/green_128x128.png"
  - ".templates/green_256x256.png"
  - ".templates/green_512x512.png"
checks:
  - id: sprites-json-exists
    cmd: test -s assets/sprites.json
    description: sprites.json exists and is not empty
  - id: templates-exist
    cmd: test -f .templates/green_128x128.png && test -f .templates/green_256x256.png
    description: Green screen templates exist
tags:
  - setup
  - validation
---

# Setup Art Style

Prepare the project for asset generation by validating configuration and creating necessary templates.

## Tasks

### 1. Validate sprites.json

Ensure `assets/sprites.json` exists and contains valid character definitions:

```json
[
  {
    "id": "character-id",
    "name": "Character Name",
    "description": "Character description",
    "palette": "Art style and color palette",
    "animation_states": ["idle", "walk"]
  }
]
```

### 2. Create Green Screen Templates

Generate green screen templates for consistent image generation:

```bash
python3 scripts/create_green_template.py
```

This creates:
- `.templates/green_128x128.png`
- `.templates/green_256x256.png`
- `.templates/green_512x512.png`

### 3. Validate Environment

Ensure required environment variables are set:
- `GEMINI_API_KEY` - For image generation

### 4. Validate Scripts

Ensure all required scripts exist:
- `scripts/generate_character_angles.py`
- `scripts/generate_secondary_refs.py`
- `scripts/generate_frames_individual.py`
- `scripts/create_green_template.py`

## Verification

- sprites.json is valid JSON with at least one character
- Green screen templates generated successfully
- GEMINI_API_KEY is set
- All required scripts are executable
