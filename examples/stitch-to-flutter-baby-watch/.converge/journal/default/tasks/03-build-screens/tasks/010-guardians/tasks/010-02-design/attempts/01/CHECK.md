# Checks: 03-build-screens/010-guardians/010-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for guardians
**Command**: `test -f .stitch/designs/guardians/design.html`

## meta-exists
**Description**: META.md exists for guardians
**Command**: `test -f .stitch/designs/guardians/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -q 'class="scaffold"' .stitch/designs/guardians/design.html`

## has-data-attributes
**Description**: HTML uses data-* attributes for Flutter conversion
**Command**: `grep -q 'data-color=' .stitch/designs/guardians/design.html`