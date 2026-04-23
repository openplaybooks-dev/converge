# Checks: 07-build-overlays/006-test-alert/006-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for test-alert
**Command**: `test -f .stitch/designs/test-alert/design.html`

## meta-exists
**Description**: META.md exists for test-alert
**Command**: `test -f .stitch/designs/test-alert/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -qE 'class="(column|row|card|bottom-sheet|dialog)"' .stitch/designs/test-alert/design.html`