# Checks: 03-build-screens/002-cycle-tracking/002-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for cycle-tracking
**Command**: `test -f .stitch/designs/cycle-tracking/design.html`

## meta-exists
**Description**: META.md exists for cycle-tracking
**Command**: `test -f .stitch/designs/cycle-tracking/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -q 'class="scaffold"' .stitch/designs/cycle-tracking/design.html`

## has-data-attributes
**Description**: HTML uses data-* attributes for Flutter conversion
**Command**: `grep -q 'data-color=' .stitch/designs/cycle-tracking/design.html`