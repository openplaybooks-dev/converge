# Checks: 03-build-screens/005-mindfulness/005-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for mindfulness
**Command**: `test -f .stitch/designs/mindfulness/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >50 lines
**Command**: `test $(wc -l < .stitch/designs/mindfulness/SPEC.md) -gt 50`