# Needs: 03-characters/03-generation/forest-elf-02-angles

## Description

Generate source.png (high-res) and canonical.png (downsized working ref) for the character's locked viewpoint.

## Expected Outputs

- `assets/characters/forest-elf/ref/source/source.png`
- `assets/characters/forest-elf/ref/canonical/canonical.png`
- `assets/characters/forest-elf/ref/manifest.json`

## Checks

- **source-png-is-real**: source.png is at least 256x256 (rejects placeholder stubs)
- **canonical-png-is-real**: canonical.png is at least 64x64 (rejects placeholder stubs)
- **manifest-has-canonical-angle**: manifest.json declares the locked viewport
