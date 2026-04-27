---
id: forest-elf-02-angles
title: Generate Lirael canonical reference
description: "Generate source.png (high-res) and canonical.png (downsized working ref) for the character's locked viewpoint."
tags:
  - character
  - reference
outputs:
  - assets/characters/forest-elf/ref/source/source.png
  - assets/characters/forest-elf/ref/canonical/canonical.png
  - assets/characters/forest-elf/ref/manifest.json
checks:
  - id: source-png-is-real
    description: source.png is at least 256x256 (rejects placeholder stubs)
    cmd: "python -c \"from PIL import Image; im=Image.open('assets/characters/forest-elf/ref/source/source.png'); assert min(im.size)>=256, f'source too small: {im.size}'\"\n"
  - id: canonical-png-is-real
    description: canonical.png is at least 64x64 (rejects placeholder stubs)
    cmd: "python -c \"from PIL import Image; im=Image.open('assets/characters/forest-elf/ref/canonical/canonical.png'); assert min(im.size)>=64, f'canonical too small: {im.size}'\"\n"
  - id: manifest-has-canonical-angle
    description: manifest.json declares the locked viewport
    cmd: "python -c \"import json; m=json.load(open('assets/characters/forest-elf/ref/manifest.json')); assert 'canonical_angle' in m and 'rotation_y' in m, f'manifest missing keys: {m}'\"\n"
vars:
  char_id: forest-elf
  char_name: Lirael
  char_description: "Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses."
  palette: "16-bit retro, green and brown tones, natural forest colors, limited to 16 colors"
  animation_states: "[\"idle\",\"walk\"]"
---

# Lirael Canonical Reference

Runs `scripts/generate_character_angles.py forest-elf`. The script reads everything else (name, description, palette, palette_constraints, canonical_angle, source_resolution, working_resolution) from `assets/sprites.json`. Outputs land under `assets/characters/forest-elf/ref/`:

- `source/source.png` (high-res original from Gemini) + sibling `source.prompt.txt` and `source.seed.txt`
- `canonical/canonical.png` (downsized working ref) + sibling `derived-from.txt`
- `manifest.json` — the locked-viewport contract every downstream task inherits

To debug, `cat` the prompt or re-run the script directly: `python scripts/generate_character_angles.py forest-elf --seed N`.
