# Checks: 07-build-overlays/007-delete-entry/007-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for delete-entry
**Command**: `test -f .stitch/designs/delete-entry/design.html`

## meta-exists
**Description**: META.md exists for delete-entry
**Command**: `test -f .stitch/designs/delete-entry/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -qE 'class="(column|row|card|bottom-sheet|dialog)"' .stitch/designs/delete-entry/design.html`