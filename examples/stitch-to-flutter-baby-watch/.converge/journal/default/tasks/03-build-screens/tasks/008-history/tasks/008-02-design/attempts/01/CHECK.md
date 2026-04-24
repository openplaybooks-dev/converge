# Checks: 03-build-screens/008-history/008-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for history
**Command**: `test -f .stitch/designs/history/design.html`

## meta-exists
**Description**: META.md exists for history
**Command**: `test -f .stitch/designs/history/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -q 'data-flutter="scaffold"' .stitch/designs/history/design.html`

## has-data-attributes
**Description**: HTML uses data-* attributes for Flutter conversion
**Command**: `grep -q 'data-flutter=' .stitch/designs/history/design.html`