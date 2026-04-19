# Checks: 03-build-screens/001-home/001-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for home
**Command**: `test -f .stitch/designs/home/design.html`

## meta-exists
**Description**: META.md exists for home
**Command**: `test -f .stitch/designs/home/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -q 'class="scaffold"' .stitch/designs/home/design.html`

## has-data-attributes
**Description**: HTML uses data-* attributes for Flutter conversion
**Command**: `grep -q 'data-color=' .stitch/designs/home/design.html`