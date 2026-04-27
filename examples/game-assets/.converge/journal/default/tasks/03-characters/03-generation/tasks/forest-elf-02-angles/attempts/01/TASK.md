# Task: 03-characters/03-generation/forest-elf-02-angles

# Lirael Canonical Reference

Runs `scripts/generate_character_angles.py forest-elf`. The script reads everything else (name, description, palette, palette_constraints, canonical_angle, source_resolution, working_resolution) from `assets/sprites.json`. Outputs land under `assets/characters/forest-elf/ref/`:

- `source/source.png` (high-res original from Gemini) + sibling `source.prompt.txt` and `source.seed.txt`
- `canonical/canonical.png` (downsized working ref) + sibling `derived-from.txt`
- `manifest.json` — the locked-viewport contract every downstream task inherits

To debug, `cat` the prompt or re-run the script directly: `python scripts/generate_character_angles.py forest-elf --seed N`.