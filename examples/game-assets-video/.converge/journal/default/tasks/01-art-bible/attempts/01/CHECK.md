# Checks: 01-art-bible

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## art-bible-exists
**Description**: ART_BIBLE.md was written
**Command**: `test -s assets/ART_BIBLE.md`

## art-bible-has-palette
**Description**: ART_BIBLE.md has at least one
**Command**: `python -c "import re; md=open('assets/ART_BIBLE.md').read(); assert re.search(r'#[0-9a-fA-F]{6}', md), 'no #RRGGBB hex codes in ART_BIBLE.md'"
`

## hero-shot-exists
**Description**: concept hero-shot was generated
**Command**: `test -s assets/concept/hero-shot.png`