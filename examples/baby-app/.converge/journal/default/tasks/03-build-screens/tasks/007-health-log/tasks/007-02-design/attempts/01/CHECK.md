# Checks: 03-build-screens/007-health-log/007-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for health-log
**Command**: `test -f .stitch/designs/health-log/design.html`

## meta-exists
**Description**: META.md exists for health-log
**Command**: `test -f .stitch/designs/health-log/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -q 'class="scaffold"' .stitch/designs/health-log/design.html`

## has-data-attributes
**Description**: HTML uses data-* attributes for Flutter conversion
**Command**: `grep -q 'data-color=' .stitch/designs/health-log/design.html`