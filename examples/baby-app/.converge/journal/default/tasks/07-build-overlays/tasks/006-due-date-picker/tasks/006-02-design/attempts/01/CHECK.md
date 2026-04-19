# Checks: 07-build-overlays/006-due-date-picker/006-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for due-date-picker
**Command**: `test -f .stitch/designs/due-date-picker/design.html`

## meta-exists
**Description**: META.md exists for due-date-picker
**Command**: `test -f .stitch/designs/due-date-picker/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -qE 'class="(column|row|card|bottom-sheet|dialog)"' .stitch/designs/due-date-picker/design.html`