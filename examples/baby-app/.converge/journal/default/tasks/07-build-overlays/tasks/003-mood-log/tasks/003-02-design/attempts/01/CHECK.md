# Checks: 07-build-overlays/003-mood-log/003-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for mood-log
**Command**: `test -f .stitch/designs/mood-log/design.html`

## meta-exists
**Description**: META.md exists for mood-log
**Command**: `test -f .stitch/designs/mood-log/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -qE 'class="(column|row|card|bottom-sheet|dialog)"' .stitch/designs/mood-log/design.html`