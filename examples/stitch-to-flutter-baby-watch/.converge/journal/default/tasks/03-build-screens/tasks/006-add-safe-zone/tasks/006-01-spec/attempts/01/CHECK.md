# Checks: 03-build-screens/006-add-safe-zone/006-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for add-safe-zone
**Command**: `test -f .stitch/designs/add-safe-zone/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >50 lines
**Command**: `test $(wc -l < .stitch/designs/add-safe-zone/SPEC.md) -gt 50`