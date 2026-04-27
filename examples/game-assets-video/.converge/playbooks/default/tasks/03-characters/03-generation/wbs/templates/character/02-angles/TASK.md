---
id: "{{char_id}}-02-ref"
title: "Generate {{char_name}} canonical reference"
description: "Generate source.png (high-res) and canonical.png (downsized working ref) for the character's locked viewpoint."
outputs:
  - "assets/characters/{{char_id}}/ref/source/source.png"
  - "assets/characters/{{char_id}}/ref/canonical/canonical.png"
  - "assets/characters/{{char_id}}/ref/manifest.json"
checks:
  - id: source-png-is-real
    cmd: |
      python -c "from PIL import Image; im=Image.open('assets/characters/{{char_id}}/ref/source/source.png'); assert min(im.size)>=256, f'source too small: {im.size}'"
    description: source.png is at least 256x256 (rejects placeholder stubs)
  - id: canonical-png-is-real
    cmd: |
      python -c "from PIL import Image; im=Image.open('assets/characters/{{char_id}}/ref/canonical/canonical.png'); assert min(im.size)>=64, f'canonical too small: {im.size}'"
    description: canonical.png is at least 64x64 (rejects placeholder stubs)
  - id: manifest-has-canonical-angle
    cmd: |
      python -c "import json; m=json.load(open('assets/characters/{{char_id}}/ref/manifest.json')); assert 'canonical_angle' in m and 'rotation_y' in m, f'manifest missing keys: {m}'"
    description: manifest.json declares the locked viewport
tags:
  - character
  - reference
---

# {{char_name}} Canonical Reference

Runs `scripts/generate_character_angles.py {{char_id}}`. The script reads everything else (name, description, palette, palette_constraints, canonical_angle, source_resolution, working_resolution) from `assets/sprites.json`. Outputs land under `assets/characters/{{char_id}}/ref/`:

- `source/source.png` (high-res original from Gemini) + sibling `source.prompt.txt` and `source.seed.txt`
- `canonical/canonical.png` (downsized working ref) + sibling `derived-from.txt`
- `manifest.json` — the locked-viewport contract every downstream task inherits

To debug, `cat` the prompt or re-run the script directly: `python scripts/generate_character_angles.py {{char_id}} --seed N`.
