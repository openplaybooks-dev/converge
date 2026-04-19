# Checks: 02-design-system/005-generate-design-references

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## meta-md-exists
**Description**: META.md exists
**Command**: `test -f .stitch/system/META.md`

## single-screen-exists
**Description**: Single screen HTML exists
**Command**: `test -f .stitch/system/single-screen.html`

## multi-state-exists
**Description**: Multi-state screen HTML exists
**Command**: `test -f .stitch/system/multi-state-screen.html`

## celebration-exists
**Description**: Celebration screen HTML exists
**Command**: `test -f .stitch/system/celebration-screen.html`

## html-has-tokens
**Description**: HTML uses CSS custom properties
**Command**: `grep -q ':root' .stitch/system/single-screen.html`