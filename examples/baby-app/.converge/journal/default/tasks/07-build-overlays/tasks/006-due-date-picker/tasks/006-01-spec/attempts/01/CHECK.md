# Checks: 07-build-overlays/006-due-date-picker/006-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for due-date-picker
**Command**: `test -f .stitch/designs/due-date-picker/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >30 lines
**Command**: `test $(wc -l < .stitch/designs/due-date-picker/SPEC.md) -gt 30`