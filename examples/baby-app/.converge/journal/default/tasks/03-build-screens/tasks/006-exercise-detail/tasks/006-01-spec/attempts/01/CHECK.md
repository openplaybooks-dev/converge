# Checks: 03-build-screens/006-exercise-detail/006-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for exercise-detail
**Command**: `test -f .stitch/designs/exercise-detail/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >50 lines
**Command**: `test $(wc -l < .stitch/designs/exercise-detail/SPEC.md) -gt 50`