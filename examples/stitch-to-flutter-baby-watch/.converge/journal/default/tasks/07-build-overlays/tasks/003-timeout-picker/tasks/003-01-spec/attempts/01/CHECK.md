# Checks: 07-build-overlays/003-timeout-picker/003-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for timeout-picker
**Command**: `test -f .stitch/designs/timeout-picker/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >30 lines
**Command**: `test $(wc -l < .stitch/designs/timeout-picker/SPEC.md) -gt 30`