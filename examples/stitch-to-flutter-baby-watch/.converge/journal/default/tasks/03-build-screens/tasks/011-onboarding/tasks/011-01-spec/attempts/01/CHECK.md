# Checks: 03-build-screens/011-onboarding/011-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for onboarding
**Command**: `test -f .stitch/designs/onboarding/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >50 lines
**Command**: `test $(wc -l < .stitch/designs/onboarding/SPEC.md) -gt 50`