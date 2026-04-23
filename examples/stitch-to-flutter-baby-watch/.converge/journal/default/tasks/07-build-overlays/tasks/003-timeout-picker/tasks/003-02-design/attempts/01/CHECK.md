# Checks: 07-build-overlays/003-timeout-picker/003-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for timeout-picker
**Command**: `test -f .stitch/designs/timeout-picker/design.html`

## meta-exists
**Description**: META.md exists for timeout-picker
**Command**: `test -f .stitch/designs/timeout-picker/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -qE 'class="(column|row|card|bottom-sheet|dialog)"' .stitch/designs/timeout-picker/design.html`