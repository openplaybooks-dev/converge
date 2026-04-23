# Checks: 03-build-screens/007-edit-safe-zone/007-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for edit-safe-zone
**Command**: `test -f .stitch/designs/edit-safe-zone/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >50 lines
**Command**: `test $(wc -l < .stitch/designs/edit-safe-zone/SPEC.md) -gt 50`