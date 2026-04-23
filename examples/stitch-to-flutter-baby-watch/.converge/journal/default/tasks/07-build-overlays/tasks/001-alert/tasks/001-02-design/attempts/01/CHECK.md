# Checks: 07-build-overlays/001-alert/001-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for alert
**Command**: `test -f .stitch/designs/alert/design.html`

## meta-exists
**Description**: META.md exists for alert
**Command**: `test -f .stitch/designs/alert/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -qE 'class="(column|row|card|bottom-sheet|dialog)"' .stitch/designs/alert/design.html`