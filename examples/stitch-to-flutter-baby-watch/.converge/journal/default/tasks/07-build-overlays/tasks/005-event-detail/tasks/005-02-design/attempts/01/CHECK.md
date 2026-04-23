# Checks: 07-build-overlays/005-event-detail/005-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for event-detail
**Command**: `test -f .stitch/designs/event-detail/design.html`

## meta-exists
**Description**: META.md exists for event-detail
**Command**: `test -f .stitch/designs/event-detail/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -qE 'class="(column|row|card|bottom-sheet|dialog)"' .stitch/designs/event-detail/design.html`