# Checks: 07-build-overlays/001-mode-selector/001-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for mode-selector
**Command**: `test -f .stitch/designs/mode-selector/design.html`

## meta-exists
**Description**: META.md exists for mode-selector
**Command**: `test -f .stitch/designs/mode-selector/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -qE 'class="(column|row|card|bottom-sheet|dialog)"' .stitch/designs/mode-selector/design.html`