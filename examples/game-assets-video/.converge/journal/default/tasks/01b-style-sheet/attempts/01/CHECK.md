# Checks: 01b-style-sheet

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## style-sheet-exists
**Description**: assets/concept/style-sheet.png was generated
**Command**: `test -s assets/concept/style-sheet.png`

## style-sheet-has-min-size
**Description**: style-sheet.png is at least 1024x512 (matches generator's 1536x1024 native output)
**Command**: `python -c "from PIL import Image; im=Image.open('assets/concept/style-sheet.png'); w,h=im.size; assert w>=1024 and h>=512, f'style-sheet too small: {im.size}'"
`