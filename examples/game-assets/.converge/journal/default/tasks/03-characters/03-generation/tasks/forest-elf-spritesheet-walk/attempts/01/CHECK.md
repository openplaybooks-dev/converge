# Checks: 03-characters/03-generation/forest-elf-spritesheet-walk

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spritesheet-png-is-4x4-grid
**Description**: Sheet is a square 4x4 grid (width == height, divisible by 4, >=256px)
**Command**: `python -c "from PIL import Image; im=Image.open('assets/characters/forest-elf/spritesheets/walk/walk.png'); w,h=im.size; assert w==h, f'not square: {im.size}'; assert w>=256 and w%4==0, f'expected 4x4 grid (square, side>=256, divisible by 4): {im.size}'"
`

## prompt-saved
**Description**: Sibling .prompt.txt exists for debugging
**Command**: `test -s assets/characters/forest-elf/spritesheets/walk/walk.prompt.txt`