# Checks: 03-build-screens/006-exercise-detail/006-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for exercise-detail
**Command**: `test -f .stitch/designs/exercise-detail/design.html`

## meta-exists
**Description**: META.md exists for exercise-detail
**Command**: `test -f .stitch/designs/exercise-detail/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -q 'class="scaffold"' .stitch/designs/exercise-detail/design.html`

## has-data-attributes
**Description**: HTML uses data-* attributes for Flutter conversion
**Command**: `grep -q 'data-color=' .stitch/designs/exercise-detail/design.html`