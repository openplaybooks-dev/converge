# Checks: 07-build-overlays/004-health-log-entry/004-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for health-log-entry
**Command**: `test -f .stitch/designs/health-log-entry/design.html`

## meta-exists
**Description**: META.md exists for health-log-entry
**Command**: `test -f .stitch/designs/health-log-entry/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -qE 'class="(column|row|card|bottom-sheet|dialog)"' .stitch/designs/health-log-entry/design.html`