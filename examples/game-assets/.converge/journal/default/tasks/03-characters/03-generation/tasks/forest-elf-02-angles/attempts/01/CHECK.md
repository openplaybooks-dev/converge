# Checks: 03-characters/03-generation/forest-elf-02-angles

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## source-png-is-real
**Description**: source.png is at least 256x256 (rejects placeholder stubs)
**Command**: `python -c "from PIL import Image; im=Image.open('assets/characters/forest-elf/ref/source/source.png'); assert min(im.size)>=256, f'source too small: {im.size}'"
`

## canonical-png-is-real
**Description**: canonical.png is at least 64x64 (rejects placeholder stubs)
**Command**: `python -c "from PIL import Image; im=Image.open('assets/characters/forest-elf/ref/canonical/canonical.png'); assert min(im.size)>=64, f'canonical too small: {im.size}'"
`

## manifest-has-canonical-angle
**Description**: manifest.json declares the locked viewport
**Command**: `python -c "import json; m=json.load(open('assets/characters/forest-elf/ref/manifest.json')); assert 'canonical_angle' in m and 'rotation_y' in m, f'manifest missing keys: {m}'"
`