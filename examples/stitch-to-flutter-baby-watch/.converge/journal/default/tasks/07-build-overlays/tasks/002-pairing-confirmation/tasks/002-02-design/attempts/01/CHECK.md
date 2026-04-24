# Checks: 07-build-overlays/002-pairing-confirmation/002-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for pairing-confirmation
**Command**: `test -f .stitch/designs/pairing-confirmation/design.html`

## meta-exists
**Description**: META.md exists for pairing-confirmation
**Command**: `test -f .stitch/designs/pairing-confirmation/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -qE 'class="(column|row|card|bottom-sheet|dialog)"' .stitch/designs/pairing-confirmation/design.html`